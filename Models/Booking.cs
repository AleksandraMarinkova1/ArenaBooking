public class Booking
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    
    // Новото својство за мејл
    public string Email { get; set; } = string.Empty; 
    
    public string Date { get; set; } = string.Empty;
    public string Court { get; set; } = string.Empty;
    public string TimeSlot { get; set; } = string.Empty;
    public bool IsBlocked { get; set; } = false;
    public string BlockReason { get; set; } = "";
    public bool IsReminderSent { get; set; } = false;
}