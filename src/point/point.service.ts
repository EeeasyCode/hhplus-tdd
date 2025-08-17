// point.service.ts - 먼저 인터페이스 정의
import { Injectable } from '@nestjs/common';
import { PointHistoryTable } from '../database/pointhistory.table';
import { UserPointTable } from '../database/userpoint.table';
import { PointHistory, UserPoint } from './point.model';

@Injectable()
export class PointService {
  constructor(
    private readonly userPointTable: UserPointTable,
    private readonly pointHistoryTable: PointHistoryTable,
  ) {}

  async getUserPoint(userId: number): Promise<UserPoint> {
    // TODO: 구현 예정
    throw new Error('Not implemented');
  }

  async chargePoint(userId: number, amount: number): Promise<UserPoint> {
    // TODO: 구현 예정
    throw new Error('Not implemented');
  }

  async usePoint(userId: number, amount: number): Promise<UserPoint> {
    // TODO: 구현 예정
    throw new Error('Not implemented');
  }

  async getPointHistories(userId: number): Promise<PointHistory[]> {
    // TODO: 구현 예정
    throw new Error('Not implemented');
  }
}
