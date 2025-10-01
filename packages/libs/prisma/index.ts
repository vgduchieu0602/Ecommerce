/**=== Tại sao phải sử dụng như này ===
 * 1. Tránh tạo quá nhiều kết nối đến database
 * 2. Tái sử dụng 1 instance Prisma duy nhất
 * 3. Phân biệt môi trường dev và production
 *    - Ở production: thường app chạy như 1 process dài hạn (không reload nhiều lần), nên chỉ cần tạo
 *    1 client và dùng xuyên suốt
 *    - Ở dev: mỗi lần code reload có thể tạo lại client mới -> dẫn đến nhiều connection dư thừa
 * 4. Typescript hỗ trợ:
 *    declare global {...} giúp tránh lỗi type khi gán biến vào globalThis (mặc định ko có prismadb)
 */

import { PrismaClient } from "@prisma/client";

//Khai báo mở rộng cho globalThis để TS biết trong globalThis sẽ tồn tại biến prismadb
declare global {
  namespace globalThis {
    var prismadb: PrismaClient;
  }
}

//Tạo 1 instance PrismaClient
const prisma = new PrismaClient();

//Nếu đang chạy môi trường production thì gán instance này vào biến global.prismadb
//=> để tái sử dụng một kết nối duy nhất với db
if (process.env.NODE_ENV === "production") {
  global.prismadb = prisma;
}

export default prisma;
