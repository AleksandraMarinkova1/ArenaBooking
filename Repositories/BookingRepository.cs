using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public class BookingRepository : IBookingRepository
{
    private readonly AppDbContext _context;

    public BookingRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Booking>> GetAllAsync()
    {
        return await _context.Bookings.ToListAsync();
    }

    public async Task<Booking> AddAsync(Booking booking)
    {
        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();
        return booking;
    }

  public async Task<bool> ExistsAsync(string date, string court, string timeSlot)
{
    return await _context.Bookings.AnyAsync(b => 
        b.Date.ToLower() == date.ToLower() && 
        b.Court.ToLower() == court.ToLower() && 
        b.TimeSlot.ToLower() == timeSlot.ToLower() && 
        !b.IsBlocked);
}
}