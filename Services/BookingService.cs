using Backend.DTOs;
using Backend.Models;
using Backend.Repositories;

namespace Backend.Services;

public class BookingService : IBookingService
{
    private readonly IBookingRepository _bookingRepository;

    public BookingService(IBookingRepository bookingRepository)
    {
        _bookingRepository = bookingRepository;
    }

    public async Task<List<BookingResponseDto>> GetAllBookingsAsync()
    {
        var bookings = await _bookingRepository.GetAllAsync();
        
        return bookings.Select(b => new BookingResponseDto
        {
            Id = b.Id,
            FullName = b.FullName,
            Email = b.Email,
            PhoneNumber = b.PhoneNumber,
            Court = b.Court,
            Date = b.Date,
            TimeSlot = b.TimeSlot,
            IsBlocked = b.IsBlocked,
            BlockReason = b.BlockReason
        }).ToList();
    }

    public async Task<BookingResponseDto> CreateBookingAsync(CreateBookingDto dto)
    {
        var exists = await _bookingRepository.ExistsAsync(dto.Date, dto.Court, dto.TimeSlot);
        if (exists)
        {
            throw new Exception("Терминот е веќе зафатен.");
        }

        var booking = new Booking
        {
            FullName = dto.FullName,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
            Court = dto.Court,
            Date = dto.Date,
            TimeSlot = dto.TimeSlot,
            IsBlocked = false,
            IsReminderSent = false
        };

        var created = await _bookingRepository.AddAsync(booking);

        return new BookingResponseDto
        {
            Id = created.Id,
            FullName = created.FullName,
            Email = created.Email,
            PhoneNumber = created.PhoneNumber,
            Court = created.Court,
            Date = created.Date,
            TimeSlot = created.TimeSlot,
            IsBlocked = created.IsBlocked
        };
    }
}