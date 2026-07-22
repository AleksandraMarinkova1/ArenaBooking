using Resend;

namespace Backend.Services;

public interface IEmailService
{
    Task SendBookingConfirmationAsync(string toEmail, string fullName, string court, string date, string timeSlot);
}

public class EmailService : IEmailService
{
    private readonly IResend _resend;

    public EmailService(IResend resend)
    {
        _resend = resend;
    }

    public async Task SendBookingConfirmationAsync(string toEmail, string fullName, string court, string date, string timeSlot)
    {
        var message = new EmailMessage()
        {
            From = "onboarding@resend.dev",
            To = toEmail,
            Subject = "Потврда за успешна резервација - Arena Booking",
            HtmlBody = $"<h3>Здраво {fullName},</h3><p>Успешно го резервиравте теренот <b>{court}</b> за датум <b>{date}</b> во термин <b>{timeSlot}</b>.</p><p>Ви благодариме!</p>"
        };

        await _resend.EmailSendAsync(message);
    }
}