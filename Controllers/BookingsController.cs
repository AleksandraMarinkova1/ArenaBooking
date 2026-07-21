using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Backend.Hubs;
using System.Text.RegularExpressions;
using System.Net;
using System.Net.Mail;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BookingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<BookingHub> _hubContext;
        private readonly IConfiguration _configuration;

        public BookingsController(AppDbContext context, IHubContext<BookingHub> hubContext, IConfiguration configuration)
        {
            _context = context;
            _hubContext = hubContext;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GetBookings([FromQuery] string date, [FromQuery] string court)
        {
            if (string.IsNullOrEmpty(date) || string.IsNullOrEmpty(court))
            {
                return BadRequest("Параметрите date и court се задолжителни!");
            }

            var cleanDate = date.Trim();
            IQueryable<Booking> query = _context.Bookings.Where(b => b.Date.Trim() == cleanDate);

            if (court != "All")
            {
                query = query.Where(b => b.Court.Trim() == court.Trim());
            }

            var bookings = await query.ToListAsync();
            return Ok(bookings);
        }

        [HttpGet("my-bookings")]
        public async Task<IActionResult> GetMyBookings([FromQuery] string phoneNumber)
        {
            if (string.IsNullOrEmpty(phoneNumber))
            {
                return BadRequest("Телефонскиот број е задолжителен!");
            }

            var bookings = await _context.Bookings
                .Where(b => b.PhoneNumber == phoneNumber)
                .ToListAsync();

            return Ok(bookings);
        }

        [HttpPost]
        public async Task<IActionResult> CreateBooking(Booking booking)
        {
            Console.WriteLine($"📧 ПРИМЕН Е-МАИЛ ОД ФРОНТЕНД: '{booking.Email}' за корисник: '{booking.FullName}'");
            
            var cleanPhone = booking.PhoneNumber.Replace(" ", "").Replace("-", "").Trim();
            var phoneRegex = new Regex(@"^07[0125678]\d{6}$");
            if (!phoneRegex.IsMatch(cleanPhone))
            {
                return BadRequest("Внесете валиден македонски мобилен број (пр. 070123456).");
            }

            booking.PhoneNumber = cleanPhone;
            var cleanDate = booking.Date.Split('T')[0].Trim();
            booking.Date = cleanDate;

            var exists = await _context.Bookings.AnyAsync(b =>
                b.TimeSlot.Trim() == booking.TimeSlot.Trim() &&
                b.Date.Trim() == booking.Date.Trim() &&
                b.Court.Trim() == booking.Court.Trim());

            if (exists)
            {
                return BadRequest("Овој термин за избраниот датум и терен е веќе резервиран!");
            }

            var activeBookingsToday = await _context.Bookings
                .Where(b => b.Date.Replace(" ", "") == cleanDate)
                .ToListAsync();

            var count = activeBookingsToday.Count(b => b.PhoneNumber.Replace(" ", "").Replace("-", "") == cleanPhone);

            if (count >= 2)
            {
                return BadRequest("Веќе имате направено 2 резервации за овој датум. Не е дозволено повеќе!");
            }

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

           try 
{
    await SendConfirmationEmail(booking);
}
catch (Exception ex)
{
    Console.WriteLine($"🔥 КРИТИЧНА ГРЕШКА ВО МЕЈЛ: {ex.Message}");
    if (ex.InnerException != null)
    {
        Console.WriteLine($"🔍 Inner: {ex.InnerException.Message}");
    }
}

            BookingHub.ClearLock(booking.Date, booking.Court, booking.TimeSlot);
            await _hubContext.Clients.All.SendAsync("ReceiveBookingCreated", booking);

            return Ok(booking);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelBooking(int id)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null)
            {
                return NotFound("Резервацијата не е пронајдена.");
            }

            _context.Bookings.Remove(booking);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveBookingCancelled", new
            {
                id = booking.Id,
                timeSlot = booking.TimeSlot,
                date = booking.Date,
                court = booking.Court
            });

            return NoContent();
        }

        private async Task SendConfirmationEmail(Booking booking)
        {
            Console.WriteLine("ВЛЕЗЕНИ СМЕ ВО SendConfirmationEmail МЕТОДОТ!");
            try
            {
                var courtName = booking.Court == "Football" ? "⚽ Фудбал" : booking.Court == "Tennis" ? "🎾 Тенис" : "🏀 Кошарка";

                // Ги читаме податоците од appsettings.json
                var smtpServer = _configuration["EmailSettings:SmtpServer"] ?? "smtp.gmail.com";
                var port = int.Parse(_configuration["EmailSettings:Port"] ?? "587");
                var senderEmail = _configuration["EmailSettings:SenderEmail"];
                var senderPassword = _configuration["EmailSettings:SenderPassword"];

                if (string.IsNullOrEmpty(senderEmail) || string.IsNullOrEmpty(senderPassword))
                {
                    Console.WriteLine("❌ Грешка: Нема дефинирано SenderEmail или SenderPassword во appsettings.json!");
                    return;
                }

                var fromAddress = new MailAddress(senderEmail, "Arena Bookings");
                var toAddress = new MailAddress(booking.Email.Trim(), booking.FullName.Trim());

                string subject = "🏆 Потврда за успешна резервација - Arena Bookings";
                string body = $@"
                    <div style='font-family: sans-serif; max-width: 500px; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px;'>
                        <h2 style='color: #2b6cb0; text-align: center; margin-top: 0;'>Успешна резервација! 🎉</h2>
                        <p>Здраво <strong>{booking.FullName}</strong>,</p>
                        <p>Твојот термин е успешно резервиран. Еве ги деталите за резервацијата:</p>
                        <table style='width: 100%; border-collapse: collapse; margin: 15px 0;'>
                            <tr style='background-color: #f7fafc;'><td style='padding: 8px; font-weight: bold;'>Терен:</td><td style='padding: 8px;'>{courtName}</td></tr>
                            <tr><td style='padding: 8px; font-weight: bold;'>Датум:</td><td style='padding: 8px;'>{booking.Date}</td></tr>
                            <tr style='background-color: #f7fafc;'><td style='padding: 8px; font-weight: bold;'>Време:</td><td style='padding: 8px;'>{booking.TimeSlot}</td></tr>
                        </table>
                        <hr style='border: none; border-top: 1px solid #e2e8f0;' />
                        <p style='font-size: 13px; color: #718096; text-align: center;'>
                            Доколку сакаш да ја откажеш резервацијата, контактирај го администраторот или посетете го нашиот сајт.
                        </p>
                        <p style='text-align: center; margin-bottom: 0; font-weight: bold; color: #2d3748;'>Се гледаме на терен!</p>
                    </div>";

                using var message = new MailMessage(fromAddress, toAddress)
                {
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };

                using var smtp = new SmtpClient
                {
                    Host = smtpServer,
                    Port = port,
                    EnableSsl = true,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    UseDefaultCredentials = false,
                    Credentials = new NetworkCredential(senderEmail, senderPassword)
                };

                await smtp.SendMailAsync(message);
                Console.WriteLine($"✅ Успешно испратен мејл до {booking.Email}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ ГРЕШКА ПРИ ПРАЌАЊЕ МЕЈЛ: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"🔍 ВНАТРЕШНА ГРЕШКА (Inner Exception): {ex.InnerException.Message}");
                }
            }
        }

        [HttpPost("block")]
        public async Task<IActionResult> BlockTimeSlots([FromBody] BlockRequest dto)
        {
            if (dto.TimeSlots == null || dto.TimeSlots.Count == 0)
            {
                dto.TimeSlots = new List<string> { 
                    "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", 
                    "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", 
                    "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00" 
                };
            }

            foreach (var slot in dto.TimeSlots)
            {
                var existing = _context.Bookings.FirstOrDefault(b => 
                    b.Date == dto.Date && b.Court == dto.Court && b.TimeSlot == slot);

                if (existing != null)
                {
                    if (existing.IsBlocked) continue;
                    _context.Bookings.Remove(existing);
                }

                var blockEntry = new Booking
                {
                    FullName = "🚫 БЛОКИРАНО ОД АДМИН",
                    PhoneNumber = "-",
                    Email = "-",
                    Court = dto.Court,
                    TimeSlot = slot,
                    Date = dto.Date,
                    IsBlocked = true,
                    BlockReason = string.IsNullOrEmpty(dto.Reason) ? "Технички причини / Празник" : dto.Reason
                };

                _context.Bookings.Add(blockEntry);
            }

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("ReceiveBookingCancelled", new { date = dto.Date }); 

            return Ok(new { message = "Успешно блокирани термини." });
        }
    }

    public class BlockRequest
    {
        public string Date { get; set; }
        public string Court { get; set; }
        public string Reason { get; set; }
        public List<string> TimeSlots { get; set; }
    }
}