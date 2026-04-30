import { Store } from "./data/stores";

export type StoreVisualVariant =
  | "restaurant"
  | "snack"
  | "cafe"
  | "beauty"
  | "market"
  | "mobility"
  | "default";

export function inferStoreVisualVariant(store: Store): StoreVisualVariant {
  const name = store.name.toLowerCase();
  const description = store.benefitDescription.toLowerCase();
  const title = store.benefitTitle.toLowerCase();
  const text = `${name} ${description} ${title}`;

  if (/카페|커피|coffee|cafe|에스프레소|라떼/.test(text)) {
    return "cafe";
  }

  if (/베이커리|빵|도넛|디저트|떡|쿠키|아이스크림|와플/.test(text)) {
    return "snack";
  }

  if (/미용|뷰티|헤어|이용|네일|피부|barber/.test(text)) {
    return "beauty";
  }

  if (store.category === "market") {
    return "market";
  }

  if (store.category === "mobility") {
    return "mobility";
  }

  if (store.category === "food") {
    return "restaurant";
  }

  return "default";
}
