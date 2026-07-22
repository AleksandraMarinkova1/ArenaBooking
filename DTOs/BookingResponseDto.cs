namespace Backend.DTOs;

public class BookingResponseDto
{
    public int Id { get; set; }
    public string FullName { get; set; }
    public string Email { get; set; }
    public string PhoneNumber { get; set; }
    public string Court { get; set; }
    public string Date { get; set; }
    public string TimeSlot { get; set; }
    public bool IsBlocked { get; set; }
    public string BlockReason { get; set; }
}