import PocketBase from "pocketbase";

// Инициализируем клиент PocketBase
// URL берется из переменных окружения
const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";
const pb = new PocketBase(pbUrl);

export default pb;
