import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { PointController } from './point.controller';
import { PointService } from './point.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PointController],
  providers: [PointService],
})
export class PointModule {}
