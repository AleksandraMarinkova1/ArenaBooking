using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Backend.Hubs;
using System.Text.RegularExpressions;
// 🚀 1. НОВИ USINGS ЗА МЕЈЛ СЕРВИСОТ
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

        public BookingsController(AppDbContext context, IHubContext<BookingHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetBookings([FromQuery] string date, [FromQuery] string court)
        {
            Console.WriteLine($"DATE FROM FRONT11: {date}");
            Console.WriteLine($"COURT FROM FRONT11: {court}");
            if (string.IsNullOrEmpty(date) || string.IsNullOrEmpty(court))
            {
                return BadRequest("Параметрите date и court се задолжителни!");
            }

            // Го чистиме датумот од празни места за сигурна споредба
            var cleanDate = date.Trim();

            // Земаме Query коешто ги чисти евентуалните празни места зачувани во базата на податоци
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
            // 1. Прочисти го внесениот број од секакви празни места и симболи
            var cleanPhone = booking.PhoneNumber.Replace(" ", "").Replace("-", "").Trim();

            // 2. Валидација на МК мобилен формат
            var phoneRegex = new Regex(@"^07[0125678]\d{6}$");
            if (!phoneRegex.IsMatch(cleanPhone))
            {
                return BadRequest("Внесете валиден македонски мобилен број (пр. 070123456).");
            }

            // Го запишуваме прочистениот број во објектот
            booking.PhoneNumber = cleanPhone;

            // Прочисти го и датумот од евентуални "T00:00:00" или празни места (ако случајно фронтендот го праќа така)
            var cleanDate = booking.Date.Split('T')[0].Trim();
            booking.Date = cleanDate;

            // 3. Проверка на дупликат термин за истиот терен во исто време
            var exists = await _context.Bookings.AnyAsync(b =>
                b.TimeSlot.Trim() == booking.TimeSlot.Trim() &&
                b.Date.Trim() == booking.Date.Trim() &&
                b.Court.Trim() == booking.Court.Trim());

            if (exists)
            {
                return BadRequest("Овој термин за избраниот датум и терен е веќе резервиран!");
            }

            // 4. Паметна проверка на лимитот за ден
            var activeBookingsToday = await _context.Bookings
                .Where(b => b.Date.Replace(" ", "") == cleanDate)
                .ToListAsync();

            var count = activeBookingsToday.Count(b => b.PhoneNumber.Replace(" ", "").Replace("-", "") == cleanPhone);

            if (count >= 2)
            {
                return BadRequest("Веќе имате направено 2 резервации за овој датум. Не е дозволено повеќе!");
            }

            // Сè е во ред, зачувај го записот
            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            // 🚀 2. ПОВИКУВАЊЕ НА МЕЈЛ ФУНКЦИЈАТА ВО ПОЗАДИНА
            // Користиме Task.Run за праќањето мејл да не го кочи/чека корисникот на фронтендот
            _ = Task.Run(() => SendConfirmationEmail(booking));

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

        // 🚀 3. ПОМОШНА ФУНКЦИЈА ЗА ИСПРАЌАЊЕ НА МЕЈЛ (Најдолу во контролерот)
        // 🚀 АЖУРИРАНА ФУНКЦИЈА ЗА ИСПРАЌАЊЕ НА МЕЈЛ
        private void SendConfirmationEmail(Booking booking)
        {
            try
            {
                var courtName = booking.Court == "Football" ? "⚽ Фудбал" : booking.Court == "Tennis" ? "🎾 Тенис" : "🏀 Кошарка";

                // Испраќач и Примач
                var fromAddress = new MailAddress("marinkovaaleksandra89@gmail.com", "Arena Bookings");
                var toAddress = new MailAddress(booking.Email.Trim(), booking.FullName.Trim());


                const string fromPassword = "gqxb hfeo fpyj aleo";

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
                            Доколку сакаш да ја откажеш резервацијата, контактирајте го администраторот или посетете го нашиот сајт.
                        </p>
                        <p style='text-align: center; margin-bottom: 0; font-weight: bold; color: #2d3748;'>Се гледаме на терен!</p>
                    </div>";

                using (var message = new MailMessage(fromAddress, toAddress)
                {
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                })
                {
                    using (var smtp = new SmtpClient
                    {
                        Host = "smtp.gmail.com",
                        Port = 587,
                        EnableSsl = true,
                        DeliveryMethod = SmtpDeliveryMethod.Network,
                        UseDefaultCredentials = false,
                        Credentials = new NetworkCredential(fromAddress.Address, fromPassword)
                    })
                    {
                        smtp.Send(message);
                    }
                }
                Console.WriteLine($"✅ Успешно испратен мејл до {booking.Email}");
            }
            catch (Exception ex)
            {
                // Ова ќе испечати детална грешка во конзолата на твоето .NET Studio за да видиш зошто точно паѓа конекцијата
                Console.WriteLine($"❌ Грешка при праќање мејл: {ex.ToString()}");
            }
        }

        [HttpPost("block")]
public async Task<IActionResult> BlockTimeSlots([FromBody] BlockRequest dto)
{
    if (dto.TimeSlots == null || dto.TimeSlots.Count == 0)
    {
        // Ако админот сака да го блокира ЦЕЛИОТ ДЕН, му ги генерираме сите стандардни термини
        // Овде стави ги твоите стандардни термини (генерално за терени или салони)
        dto.TimeSlots = new List<string> { 
            "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", 
            "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", 
            "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00" 
        };
    }

    foreach (var slot in dto.TimeSlots)
    {
        // Проверуваме дали веќе постои резервација или блокада за тој термин
        var existing = _context.Bookings.FirstOrDefault(b => 
            b.Date == dto.Date && b.Court == dto.Court && b.TimeSlot == slot);

        if (existing != null)
        {
            if (existing.IsBlocked) continue; // Веќе е блокирано, прескокни
            
            // Ако имало обична резервација од корисник, ја пребришуваме/откажуваме во корист на блокадата
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
    
    // Преку SignalR испраќаме известување за сите да видат во реално време дека термините се затворени
    await _hubContext.Clients.All.SendAsync("ReceiveBookingCancelled", new { date = dto.Date }); 

    return Ok(new { message = "Успешно блокирани термини." });
}

// Помошна класа (DTO) за примање на барањето за блокада
public class BlockRequest
{
    public string Date { get; set; }
    public string Court { get; set; } // Терен или Салон-Услуга
    public string Reason { get; set; }
    public List<string> TimeSlots { get; set; } // Ако е празно, се блокира цел ден
}
    }
    


    
}