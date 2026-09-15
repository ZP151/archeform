import type { z } from "zod";
import { registeredDefinition } from "./definition-selection-catalogue.js";

/** Private compatibility names; all definition content comes from the fixed JSON catalogue. */
export const restaurantDefinition = registeredDefinition("restaurant-ordering");
export const restaurantDefinitionSelectionSchema =
  restaurantDefinition.selectionSchema;
export type RestaurantDefinitionSelectionV1 = z.infer<
  typeof restaurantDefinitionSelectionSchema
>;
export const projectRestaurantDefinitionSelection =
  restaurantDefinition.project;
