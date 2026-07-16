public class TimeSlot
{
    public int Id { get; set; }
    public string SlotText { get; set; } // Пример: "08:00 - 09:00", "22:00 - 23:00"
    public bool IsActive { get; set; } = true; // Дали терминот воопшто е овозможен за резервации
}