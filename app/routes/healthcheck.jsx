import { civitatisHealthcheck } from "../utils/civitatis.server";

export const loader = async () => civitatisHealthcheck();
