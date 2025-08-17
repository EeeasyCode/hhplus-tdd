import {
  anyNumber,
  instance,
  mock,
  reset,
  verify,
  when,
} from '@johanblumenberg/ts-mockito';
import { BadRequestException } from '@nestjs/common';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { UserPointTable } from 'src/database/userpoint.table';
import { TransactionType } from 'src/point/point.model';
import { PointService } from 'src/point/point.service';

describe('PointService', () => {
  let pointService: PointService;
  let mockUserPointTable: UserPointTable;
  let mockPointHistoryTable: PointHistoryTable;

  beforeEach(() => {
    mockUserPointTable = mock(UserPointTable);
    mockPointHistoryTable = mock(PointHistoryTable);

    pointService = new PointService(
      instance(mockUserPointTable),
      instance(mockPointHistoryTable),
    );
  });

  afterEach(() => {
    reset(mockUserPointTable);
    reset(mockPointHistoryTable);
  });

  describe('getUserPoint', () => {
    it('유저 ID로 포인트를 조회할 수 있다.', async () => {
      const mockUserPoint = {
        id: 1,
        point: 5000,
        updateMillis: new Date('2025-01-01').getTime(),
      };

      when(mockUserPointTable.selectById(1)).thenReturn(
        Promise.resolve(mockUserPoint),
      );

      const result = await pointService.getUserPoint(1);

      expect(result.id).toBe(1);
      expect(result.point).toBe(5000);
      expect(result.updateMillis).toBe(mockUserPoint.updateMillis);
    });

    it('존재하지 않는 유저의 포인트를 조회하면 기본값(0 포인트)을 반환한다.', async () => {
      when(mockUserPointTable.selectById(999)).thenReturn(
        Promise.resolve({
          id: 999,
          point: 0,
          updateMillis: Date.now(),
        }),
      );

      const result = await pointService.getUserPoint(999);

      expect(result.id).toBe(999);
      expect(result.point).toBe(0);
    });
  });

  describe('chargePoint', () => {
    it('포인트를 충전할 수 있다.', async () => {
      const currentPoint = {
        id: 1,
        point: 1000,
        updateMillis: new Date('2025-01-01').getTime(),
      };

      when(mockUserPointTable.selectById(1)).thenReturn(
        Promise.resolve(currentPoint),
      );

      const result = await pointService.chargePoint(1, 5000);

      expect(result.id).toBe(1);
      expect(result.point).toBe(6000); // 1000 + 5000
    });

    it('0 이하의 금액으로 충전하려고 하면 에러를 발생시킨다.', async () => {
      await expect(pointService.chargePoint(1, 0)).rejects.toThrow(
        BadRequestException,
      );

      await expect(pointService.chargePoint(1, -1000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('포인트 충전 내역이 히스토리에 기록된다.', async () => {
      const currentPoint = {
        id: 1,
        point: 1000,
        updateMillis: new Date('2025-01-01').getTime(),
      };

      when(mockUserPointTable.selectById(1)).thenReturn(
        Promise.resolve(currentPoint),
      );

      await pointService.chargePoint(1, 5000);

      verify(
        mockPointHistoryTable.insert(
          1,
          5000,
          TransactionType.CHARGE,
          anyNumber(),
        ),
      ).once();
    });
  });

  describe('usePoint', () => {
    it('보유한 잔액이 사용할 금액보다 큰 경우, 포인트를 사용할 수 있다.', async () => {
      when(mockUserPointTable.selectById(1)).thenReturn(
        Promise.resolve({
          id: 1,
          point: 10000,
          updateMillis: new Date('2025-01-01').getTime(),
        }),
      );

      const result = await pointService.usePoint(1, 10000);

      expect(result.id).toBe(1);
      expect(result.point).toBe(0);
    });

    it('보유한 잔액이 사용할 금액보다 작은 경우, 포인트를 사용할 수 없다.', async () => {
      when(mockUserPointTable.selectById(1)).thenReturn(
        Promise.resolve({
          id: 1,
          point: 3000,
          updateMillis: new Date('2025-01-01').getTime(),
        }),
      );

      await expect(pointService.usePoint(1, 10000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('0 이하의 금액으로 사용하려고 하면 에러를 발생시킨다.', async () => {
      await expect(pointService.usePoint(1, 0)).rejects.toThrow(
        BadRequestException,
      );

      await expect(pointService.usePoint(1, -1000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('포인트 사용 내역이 히스토리에 기록된다.', async () => {
      when(mockUserPointTable.selectById(1)).thenReturn(
        Promise.resolve({
          id: 1,
          point: 10000,
          updateMillis: new Date('2025-01-01').getTime(),
        }),
      );

      await pointService.usePoint(1, 5000);

      verify(
        mockPointHistoryTable.insert(1, 5000, TransactionType.USE, anyNumber()),
      ).once();
    });
  });

  describe('getPointHistories', () => {
    it('유저의 포인트 사용/충전 내역을 조회할 수 있다.', async () => {
      const mockHistories = [
        {
          id: 1,
          userId: 1,
          amount: 1000,
          type: TransactionType.CHARGE,
          timeMillis: new Date('2025-01-01').getTime(),
        },
        {
          id: 2,
          userId: 1,
          amount: 500,
          type: TransactionType.USE,
          timeMillis: new Date('2025-01-02').getTime(),
        },
      ];

      when(mockPointHistoryTable.selectAllByUserId(1)).thenReturn(
        Promise.resolve(mockHistories),
      );

      const result = await pointService.getPointHistories(1);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(TransactionType.USE);
      expect(result[1].type).toBe(TransactionType.CHARGE);
    });

    it('포인트 내역이 없는 유저의 경우 빈 배열을 반환한다.', async () => {
      when(mockPointHistoryTable.selectAllByUserId(999)).thenReturn(
        Promise.resolve([]),
      );

      const result = await pointService.getPointHistories(999);

      expect(result).toEqual([]);
    });

    it('포인트 내역이 시간순으로 정렬되어 반환된다.', async () => {
      const mockHistories = [
        {
          id: 2,
          userId: 1,
          amount: 500,
          type: TransactionType.USE,
          timeMillis: new Date('2025-01-01').getTime(),
        },
        {
          id: 1,
          userId: 1,
          amount: 1000,
          type: TransactionType.CHARGE,
          timeMillis: new Date('2025-01-04').getTime(),
        },
      ];

      when(mockPointHistoryTable.selectAllByUserId(1)).thenReturn(
        Promise.resolve(mockHistories),
      );

      const result = await pointService.getPointHistories(1);

      expect(result[0].timeMillis).toBeGreaterThan(result[1].timeMillis);
    });
  });
});
