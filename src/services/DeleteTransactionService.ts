import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    try {
      const transactionsRepository = getCustomRepository(
        TransactionsRepository,
      );

      const transaction = await transactionsRepository.findOne(id);

      if (!transaction) {
        throw new AppError('Invalid transaction', 400);
      }

      await transactionsRepository.remove(transaction);
    } catch (error) {
      throw new AppError(
        'Something went wrong while deleting transaction',
        400,
      );
    }
  }
}

export default DeleteTransactionService;
