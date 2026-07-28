import { Injectable } from "@nestjs/common";

export type HealthStatus = {
  status: "ok";
  service: "control-plane";
};

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return {
      status: "ok",
      service: "control-plane",
    };
  }
}
