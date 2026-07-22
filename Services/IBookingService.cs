using Backend.DTOs;

namespace Backend.Services;

public interface IBookingService
{
    Task<List<BookingResponseDto>> GetAllBookingsAsync();
    Task<BookingResponseDto> CreateBookingAsync(CreateBookingDto dto);
}