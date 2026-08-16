import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { CompositionService } from "./composition.service.js";
import { ProductCompositionService } from "./product-composition.service.js";

@Controller()
export class CompositionController {
  constructor(
    @Inject(CompositionService)
    private readonly composition: CompositionService,
    @Inject(ProductCompositionService)
    private readonly productComposition: ProductCompositionService,
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

  // Product closure journey over a blank Draft: requirement + blueprint in,
  // a composed Application Graph out, through the same governed review row.

  @Post("product/requirements")
  createProductRequirement(@Body() body: unknown) {
    return this.productComposition.createProductRequirement(body);
  }

  @Get("product/requirements/:reviewId")
  getProductReview(@Param("reviewId") reviewId: string) {
    return this.productComposition.getReview(reviewId);
  }

  @Post("product/requirements/:reviewId/plan")
  requestProductPlan(@Param("reviewId") reviewId: string) {
    return this.productComposition.requestProductPlan(reviewId);
  }

  @Post("product/requirements/:reviewId/choices")
  chooseProductPlan(
    @Param("reviewId") reviewId: string,
    @Body() body: unknown,
  ) {
    return this.productComposition.chooseProductPlan(reviewId, body);
  }

  @Post("product/requirements/:reviewId/apply")
  applyProduct(@Param("reviewId") reviewId: string) {
    return this.productComposition.applyProduct(reviewId);
  }
}
