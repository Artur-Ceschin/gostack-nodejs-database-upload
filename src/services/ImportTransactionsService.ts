import csvParse from 'csv-parse';
import fs from 'fs';
import { In, Repository, getCustomRepository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    try {
      const fileStream = fs.createReadStream(filePath);
      const transactionsRepository = getCustomRepository(
        TransactionsRepository,
      );
      const categoriesRepository = getRepository(Category);

      const parser = csvParse({
        from_line: 2,
      });

      const parseCSV = fileStream.pipe(parser);

      const transactions: CSVTransaction[] = [];
      const categories: string[] = [];

      parseCSV.on('data', async line => {
        const [title, type, value, category] = line.map((cell: string) =>
          cell.trim(),
        );

        if (title && value && type) {
          categories.push(category);
          transactions.push({ title, value, type, category });
        }
      });

      await new Promise(resolve => parseCSV.on('end', resolve));

      await this.processCategories(categories, categoriesRepository);
      const createdTransactions = await this.processTransactions(
        transactions,
        transactionsRepository,
        categoriesRepository,
      );

      await this.unlinkFile(filePath);

      return createdTransactions;
    } catch {
      throw new AppError('An error occurred while processing your request');
    }
  }

  private async processCategories(
    categories: string[],
    categoriesRepository: Repository<Category>,
  ): Promise<void> {
    try {
      const existentCategories = await categoriesRepository.find({
        where: {
          title: In(categories),
        },
      });

      const existentCategoriesTitles = existentCategories.map(
        category => category.title,
      );

      const addCategoryTitles = categories
        .filter(category => !existentCategoriesTitles.includes(category))
        .filter((value, index, self) => self.indexOf(value) === index);

      const newCategories = categoriesRepository.create(
        addCategoryTitles.map(title => ({
          title,
        })),
      );

      await categoriesRepository.save(newCategories);
    } catch {
      throw new AppError(
        'An error occurred while saving your category, try again later',
      );
    }
  }

  private async processTransactions(
    transactions: CSVTransaction[],
    transactionsRepository: TransactionsRepository,
    categoriesRepository: Repository<Category>,
  ): Promise<Transaction[]> {
    try {
      const categories = await categoriesRepository.find();

      const createdTransactions = transactions.map(transaction => {
        const category = categories.find(
          categoryData => categoryData.title === transaction.category,
        );

        return transactionsRepository.create({
          title: transaction.title,
          type: transaction.type,
          value: transaction.value,
          category,
        });
      });

      return transactionsRepository.save(createdTransactions);
    } catch {
      throw new AppError(
        'An error occurred while saving your transaction, try again later',
      );
    }
  }

  private async unlinkFile(filePath: string): Promise<void> {
    await fs.promises.unlink(filePath);
  }
}

export default ImportTransactionsService;
