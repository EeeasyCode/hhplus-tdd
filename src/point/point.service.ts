// point.service.ts - 먼저 인터페이스 정의
import { BadRequestException, Injectable } from '@nestjs/common';
import { PointHistoryTable } from '../database/pointhistory.table';
import { UserPointTable } from '../database/userpoint.table';
import { PointHistory, TransactionType, UserPoint } from './point.model';

@Injectable()
export class PointService {
  constructor(
    private readonly userPointTable: UserPointTable,
    private readonly pointHistoryTable: PointHistoryTable,
  ) {}

  async getUserPoint(userId: number): Promise<UserPoint> {
    const userPoint = await this.userPointTable.selectById(userId);

    return userPoint;
  }

  async chargePoint(userId: number, amount: number): Promise<UserPoint> {
    if (amount <= 0) {
      throw new BadRequestException('충전 금액은 0보다 커야 합니다.');
    }

    const userPoint = await this.userPointTable.selectById(userId);
    const chargedPoint = userPoint.point + amount;
    const updateTime = Date.now();

    await this.userPointTable.insertOrUpdate(userId, chargedPoint);
    await this.pointHistoryTable.insert(
      userId,
      amount,
      TransactionType.CHARGE,
      updateTime,
    );

    return {
      id: userId,
      point: chargedPoint,
      updateMillis: updateTime,
    };
  }

  async usePoint(userId: number, amount: number): Promise<UserPoint> {
    if (amount <= 0) {
      throw new BadRequestException('사용 금액은 0보다 커야 합니다.');
    }

    const userPoint = await this.userPointTable.selectById(userId);

    if (userPoint.point < amount) {
      throw new BadRequestException('포인트가 부족합니다.');
    }

    const usedPoint = userPoint.point - amount;
    const updateTime = Date.now();

    await this.userPointTable.insertOrUpdate(userId, usedPoint);
    await this.pointHistoryTable.insert(
      userId,
      amount,
      TransactionType.USE,
      updateTime,
    );

    return {
      id: userId,
      point: usedPoint,
      updateMillis: updateTime,
    };
  }

  async getPointHistories(userId: number): Promise<PointHistory[]> {
    const histories = await this.pointHistoryTable.selectAllByUserId(userId);

    return histories.sort((a, b) => b.timeMillis - a.timeMillis);
  }
}
