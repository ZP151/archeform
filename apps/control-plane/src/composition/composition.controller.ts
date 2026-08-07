import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { CompositionService } from "./composition.service.js";

@Controller()
export class CompositionController {
  constructor(
    @Inject(CompositionService)
    private readonly composition: CompositionService,
  ) {}

  @Post("application-graphs/:applicationGraphId/composition/requirements")
  createRequirement(
    @Param("applicationGraphId") applicationGraphId: string,
    @Body() body: unknown,
  ) {
    return this.composition.createRequirement(applicationGraphId, body);
  }

  @Post(
    "application-graphs/:applicationGraphId/composition/reviews/:reviewId/plan",
  )
  requestPlan(
    @Param("applicationGraphId") applicationGraphId: string,
    @Param("reviewId") reviewId: string,
  ) {
    return this.composition.requestPlan(applicationGraphId, reviewId);
  }

  @Get("application-graphs/:applicationGraphId/composition/reviews/:reviewId")
  getReview(
    @Param("applicationGraphId") applicationGraphId: string,
    @Param("reviewId") reviewId: string,
  ) {
    return this.composition.getReview(applicationGraphId, reviewId);
  }

  @Post(
    "application-graphs/:applicationGraphId/composition/reviews/:reviewId/decisions",
  )
  decide(
    @Param("applicationGraphId") applicationGraphId: string,
    @Param("reviewId") reviewId: string,
    @Body() body: unknown,
  ) {
    return this.composition.decide(applicationGraphId, reviewId, body);
  }

  @Post(
    "application-graphs/:applicationGraphId/composition/reviews/:reviewId/apply",
  )
  apply(
    @Param("applicationGraphId") applicationGraphId: string,
    @Param("reviewId") reviewId: string,
  ) {
    return this.composition.apply(applicationGraphId, reviewId);
  }
}
