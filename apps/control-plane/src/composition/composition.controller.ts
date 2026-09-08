import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { CompositionService } from "./composition.service.js";
import { ProductCompositionService } from "./product-composition.service.js";

type PublicCompositionResponse<T> = T extends { review: infer Review }
  ? Omit<T, "review"> & { review: Omit<Review, "businessParametersProvided"> }
  : T;

/** Presence is a persistence-only replay discriminator, never a public field. */
async function publicCompositionResponse<T>(
  response: Promise<T>,
): Promise<PublicCompositionResponse<T>> {
  const result = await response;
  if (
    result !== null &&
    typeof result === "object" &&
    "review" in result &&
    result.review !== null &&
    typeof result.review === "object"
  ) {
    const { businessParametersProvided: _presence, ...review } =
      result.review as Record<string, unknown>;
    return { ...result, review } as PublicCompositionResponse<T>;
  }
  return result as PublicCompositionResponse<T>;
}

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
    return publicCompositionResponse(
      this.composition.createRequirement(applicationGraphId, body),
    );
  }

  @Post(
    "application-graphs/:applicationGraphId/composition/reviews/:reviewId/plan",
  )
  requestPlan(
    @Param("applicationGraphId") applicationGraphId: string,
    @Param("reviewId") reviewId: string,
  ) {
    return publicCompositionResponse(
      this.composition.requestPlan(applicationGraphId, reviewId),
    );
  }

  @Get("application-graphs/:applicationGraphId/composition/reviews/:reviewId")
  getReview(
    @Param("applicationGraphId") applicationGraphId: string,
    @Param("reviewId") reviewId: string,
  ) {
    return publicCompositionResponse(
      this.composition.getReview(applicationGraphId, reviewId),
    );
  }

  @Post(
    "application-graphs/:applicationGraphId/composition/reviews/:reviewId/decisions",
  )
  decide(
    @Param("applicationGraphId") applicationGraphId: string,
    @Param("reviewId") reviewId: string,
    @Body() body: unknown,
  ) {
    return publicCompositionResponse(
      this.composition.decide(applicationGraphId, reviewId, body),
    );
  }

  @Post(
    "application-graphs/:applicationGraphId/composition/reviews/:reviewId/apply",
  )
  apply(
    @Param("applicationGraphId") applicationGraphId: string,
    @Param("reviewId") reviewId: string,
  ) {
    return publicCompositionResponse(
      this.composition.apply(applicationGraphId, reviewId),
    );
  }

  // Product closure journey over a blank Draft: requirement + blueprint in,
  // a composed Application Graph out, through the same governed review row.

  @Post("product/requirements")
  createProductRequirement(@Body() body: unknown) {
    return publicCompositionResponse(
      this.productComposition.createProductRequirement(body),
    );
  }

  @Get("product/requirements/:reviewId")
  getProductReview(@Param("reviewId") reviewId: string) {
    return publicCompositionResponse(
      this.productComposition.getReview(reviewId),
    );
  }

  @Post("product/requirements/:reviewId/plan")
  requestProductPlan(@Param("reviewId") reviewId: string) {
    return publicCompositionResponse(
      this.productComposition.requestProductPlan(reviewId),
    );
  }

  @Post("product/requirements/:reviewId/choices")
  chooseProductPlan(
    @Param("reviewId") reviewId: string,
    @Body() body: unknown,
  ) {
    return publicCompositionResponse(
      this.productComposition.chooseProductPlan(reviewId, body),
    );
  }

  @Post("product/requirements/:reviewId/apply")
  applyProduct(@Param("reviewId") reviewId: string) {
    return publicCompositionResponse(
      this.productComposition.applyProduct(reviewId),
    );
  }
}
