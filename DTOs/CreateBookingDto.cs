namespace Backend.DTOs;

public class CreateBookingDto
{
    public string FullName { get; set; }
    public string Email { get; set; }
    public string PhoneNumber { get; set; }
    public string Court { get; set; }
    public string Date { get; set; }
    public string TimeSlot { get; set; }
}