import nodemailer from "nodemailer";
import dotenv from "dotenv";
import ejs from "ejs";
import path from "path";

dotenv.config();

//Tạo transporter để cấu hình cách gửi email
//Dùng nodemailer với thông tin SMTP (host, port, user, pass)
//Các giá trị này lưu trong .env để bảo mật
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  service: process.env.SMTP_SERVICE,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Hàm render template EJS thành nội dung HTML email
// - template: tên file EJS
// - data: dữ liệu truyền vào template để render
const renderEmailTemplate = async (
  templateName: string,
  data: Record<string, any>
): Promise<string> => {
  //Xác định đường dẫn đến file template .ejs
  const templatePath = path.join(
    process.cwd(), //thư mục gốc dự án
    "apps",
    "auth-service",
    "src",
    "utils",
    "email-templates",
    `${templateName}.ejs`
  );

  //render file ejs với dữ liệu truyền vào
  return ejs.renderFile(templatePath, data);
};

//Hàm gửi email
//+ to: địa chỉ người nhận
//+ subject: tiêu đề email
//+ templateName: tên template EJS để render nội dung
//+ data: dữ liệu đi kèm template
export const sendEmail = async (
  to: string,
  subject: string,
  templateName: string,
  data: Record<string, any>
) => {
  try {
    //Render HTML từ template EJS
    const html = await renderEmailTemplate(templateName, data);

    //Gửi email bằng transporter đã cấu hình
    await transporter.sendMail({
      from: `<${process.env.SMTP_USER}>`, //email gửi đi
      to,
      subject,
      html,
    });

    return true;  //gửi thành công
  } catch (error) {
    console.log("Error sending email", error);  //báo lỗi
    return false;
  }
};
