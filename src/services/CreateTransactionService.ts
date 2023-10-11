import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    try {
      const transactionsRepository = getCustomRepository(
        TransactionsRepository,
      );
      const categoryRepository = getRepository(Category);

      const { total } = await transactionsRepository.getBalance();

      if (type === 'outcome' && value > total) {
        throw new AppError('Your outcome is grater than your total value', 400);
      }

      let transactionCategory = await categoryRepository.findOne({
        where: {
          title: category,
        },
      });

      if (!transactionCategory) {
        transactionCategory = categoryRepository.create({
          title: category,
        });

        await categoryRepository.save(transactionCategory);
      }

      const transaction = transactionsRepository.create({
        title,
        type,
        value,
        category: transactionCategory,
      });

      await transactionsRepository.save(transaction);

      return transaction;
    } catch (error) {
      throw new AppError('An error occurred while creating a transaction', 400);
    }
  }
}

export default CreateTransactionService;
