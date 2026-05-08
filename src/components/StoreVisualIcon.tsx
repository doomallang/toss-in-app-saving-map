import {
  Coffee,
  Croissant,
  Scissors,
  ShoppingBasket,
  Soup,
  Store as StoreIcon,
  TramFront,
} from "lucide-react";

import type { StoreVisualVariant } from "../storeVisuals";

export default function StoreVisualIcon({
  variant,
  size = 22,
}: {
  variant: StoreVisualVariant;
  size?: number;
}) {
  if (variant === "restaurant") return <Soup size={size} />;
  if (variant === "snack") return <Croissant size={size} />;
  if (variant === "cafe") return <Coffee size={size} />;
  if (variant === "beauty") return <Scissors size={size} />;
  if (variant === "market") return <ShoppingBasket size={size} />;
  if (variant === "mobility") return <TramFront size={size} />;
  return <StoreIcon size={size} />;
}
