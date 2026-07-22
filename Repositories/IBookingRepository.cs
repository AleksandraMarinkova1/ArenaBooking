using Backend.Models;

namespace Backend.Repositories;

public interface IBookingRepository
{
    Task<List<Booking>> GetAllAsync();
    Task<Booking> AddAsync(Booking booking);
    Task<bool> ExistsAsync(string date, string court, string timeSlot);
}