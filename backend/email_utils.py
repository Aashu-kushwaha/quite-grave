import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# It is recommended to use App Passwords for Gmail if 2FA is enabled.
# E.g. EMAIL_SENDER = "gravequit.auth@gmail.com"
# EMAIL_PASSWORD = "your-16-digit-app-password"

def send_verification_email(to_email: str, code: str):
    sender_email = os.environ.get("EMAIL_SENDER")
    sender_password = os.environ.get("EMAIL_PASSWORD")

    if not sender_email or not sender_password:
        # If no credentials exist, fallback to a local terminal print for dev mode
        print(f"==================================================")
        print(f"MOCK EMAIL TO: {to_email}")
        print(f"VERIFICATION CODE: {code}")
        print(f"==================================================")
        return True

    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = "Gravequit - Verify Your Email"
        message["From"] = f"Gravequit Security <{sender_email}>"
        message["To"] = to_email

        text = f"""
        Welcome to Gravequit.
        
        Your verification code is: {code}
        
        This code will expire in 10 minutes.
        """
        
        html = f"""
        <html>
          <body>
            <h2>Welcome to Gravequit</h2>
            <p>Your verification code is:</p>
            <h1 style="color: #A8C5B0; background: #1A1A1A; padding: 10px; display: inline-block; border-radius: 8px;">{code}</h1>
            <p>This code will expire in 10 minutes.</p>
          </body>
        </html>
        """

        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")

        message.attach(part1)
        message.attach(part2)

        # Connect to Gmail SMTP server
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, message.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
