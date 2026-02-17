const { onCall } = require("firebase-functions/v2/https");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "softplan2026@gmail.com",
    pass: "komb cmuc aamk dgkz"
  }
});

exports.enviarComprovanteEmail = onCall(async (request) => {

  const { email, nome, link } = request.data;

  const mailOptions = {
    from: "Agência Lira <softplan2026@gmail.com>",
    to: email,
    subject: "Seu Comprovante - Agência Lira",
    html: `
      <h2>Olá ${nome}</h2>
      <p>Seu comprovante está disponível no link abaixo:</p>
      <a href="${link}">Baixar Comprovante</a>
      <br><br>
      <p>Obrigado por utilizar nossos serviços.</p>
    `
  };

  await transporter.sendMail(mailOptions);

  return { success: true };
});
