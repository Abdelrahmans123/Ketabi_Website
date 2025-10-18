import nodemailer from "nodemailer";
export const sendEmail = async ({ to, subject, text, html }) => {
	const transporter = nodemailer.createTransport({
		service: "gmail",
		auth: {
			user: process.env.APP_EMAIL,
			pass: process.env.APP_PASSWORD,
		},
	});

	const mailOptions = {
		from: process.env.APP_EMAIL,
		to,
		subject,
		text,
		html,
	};

	try {
		await transporter.sendMail(mailOptions);
		console.log("Email sent successfully");
	} catch (error) {
		console.error("Error sending email:", error);
		throw new Error("Failed to send email");
	}
};
