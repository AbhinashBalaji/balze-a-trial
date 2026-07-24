import os
import smtplib
from email.message import EmailMessage

def send_invitation_email(recipient_email: str, activation_link: str):
    """
    Sends an invitation email to the specified recipient using SMTP.
    Requires SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD in env.
    """
    from app.config import settings

    smtp_host = settings.smtp_host
    smtp_port = settings.smtp_port or "465"
    smtp_user = settings.smtp_username
    smtp_pass = settings.smtp_password

    if not smtp_host or not smtp_user or not smtp_pass:
        print(f"Skipping email to {recipient_email}: SMTP credentials not configured.")
        return

    msg = EmailMessage()
    msg.set_content(
        f"Hello,\n\nYou have been invited to join AthenaIQ!\n\n"
        f"Please click the link below to accept your invitation and create your password:\n"
        f"{activation_link}\n\n"
        f"Welcome to AthenaIQ!\n\n"
        f"Best,\nThe AthenaIQ Team"
    )

    msg.add_alternative(f"""\
    <html>
      <body>
        <p>Hello,</p>
        <p>You have been invited to join <strong>AthenaIQ</strong>!</p>
        <p>Welcome to AthenaIQ</p>
        <p>
          <a href="{activation_link}" style="display:inline-block;padding:10px 20px;color:#fff;background-color:#6366f1;text-decoration:none;border-radius:5px;">Accept Invitation</a>
        </p>
        <p>Or copy this link: {activation_link}</p>
        <p>Best,<br>The AthenaIQ Team</p>
      </body>
    </html>
    """, subtype='html')

    msg["Subject"] = "You're invited to AthenaIQ!"
    msg["From"] = smtp_user
    msg["To"] = recipient_email

    try:
        # Port 465 usually means SMTP_SSL, while 587 uses starttls.
        # We will try SSL first if port 465, else normal SMTP with starttls
        if str(smtp_port) == "465":
            with smtplib.SMTP_SSL(smtp_host, int(smtp_port)) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
                server.ehlo()
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        print(f"Successfully sent invitation email to {recipient_email}")
    except Exception as e:
        print(f"Failed to send email to {recipient_email}: {e}")
        raise e

def send_credentials_email(recipient_email: str, password: str, login_link: str):
    """
    Sends manually created login credentials to the new user.
    """
    from app.config import settings

    smtp_host = settings.smtp_host
    smtp_port = settings.smtp_port or "465"
    smtp_user = settings.smtp_username
    smtp_pass = settings.smtp_password

    if not smtp_host or not smtp_user or not smtp_pass:
        print(f"Skipping email to {recipient_email}: SMTP credentials not configured.")
        return

    msg = EmailMessage()
    msg.set_content(
        f"Hello,\n\nYour AthenaIQ account has been created.\n\n"
        f"Email: {recipient_email}\n"
        f"Password: {password}\n\n"
        f"Please login at {login_link} to change your password.\n\n"
        f"Best,\nThe AthenaIQ Team"
    )

    msg.add_alternative(f"""\
    <html>
      <body>
        <p>Hello,</p>
        <p>Your <strong>AthenaIQ</strong> account has been created by your administrator.</p>
        <p><strong>Email:</strong> {recipient_email}</p>
        <p><strong>Temporary Password:</strong> {password}</p>
        <p>
          <a href="{login_link}" style="display:inline-block;padding:10px 20px;color:#fff;background-color:#6366f1;text-decoration:none;border-radius:5px;">Login Now</a>
        </p>
        <p>You will be required to change your password upon your first login.</p>
        <p>Best,<br>The AthenaIQ Team</p>
      </body>
    </html>
    """, subtype='html')

    msg["Subject"] = "Your AthenaIQ Account Details"
    msg["From"] = smtp_user
    msg["To"] = recipient_email

    try:
        if str(smtp_port) == "465":
            with smtplib.SMTP_SSL(smtp_host, int(smtp_port)) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
                server.ehlo()
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        print(f"Successfully sent credentials email to {recipient_email}")
    except Exception as e:
        print(f"Failed to send email to {recipient_email}: {e}")
        raise e
