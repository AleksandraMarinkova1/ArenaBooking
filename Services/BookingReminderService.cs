using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace Backend.Services
{
    public class BookingReminderService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BookingReminderService> _logger;

        public BookingReminderService(IServiceProvider serviceProvider, ILogger<BookingReminderService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Booking Reminder Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                        
                        var now = DateTime.Now;
                        _logger.LogInformation($"Checking for upcoming bookings at {now}...");

                        var bookings = await context.Bookings
                            .Where(b => !b.IsReminderSent && !b.IsBlocked && !string.IsNullOrEmpty(b.Email))
                            .ToListAsync(stoppingToken);

                        foreach (var booking in bookings)
                        {
                            try
                            {
                            
                                if (string.IsNullOrEmpty(booking.Date) || string.IsNullOrEmpty(booking.TimeSlot) || booking.TimeSlot.Length < 5)
                                    continue;

                                var startTimeStr = booking.TimeSlot.Substring(0, 5); 
                                var bookingDateTimeString = $"{booking.Date} {startTimeStr}";

                                if (DateTime.TryParseExact(bookingDateTimeString, "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var bookingDateTime))
                                {
                                   
                                    var timeDifference = bookingDateTime - now;

                                   
                                    if (timeDifference.TotalMinutes <= 60 && timeDifference.TotalMinutes > 0)
                                    {
                                        _logger.LogInformation($"SENDING REMINDER EMAIL to {booking.Email} for booking at {bookingDateTime}");

                                     
                                        booking.IsReminderSent = true;
                                        await context.SaveChangesAsync(stoppingToken);
                                    }
                                }
                            }
                            catch (Exception innerEx)
                            {
                                _logger.LogError(innerEx, $"Error processing reminder for booking ID {booking.Id}");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred while executing booking reminders loop.");
                }

          
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}