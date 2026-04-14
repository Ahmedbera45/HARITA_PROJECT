namespace Harita.API.Entities;

public class NoteCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#1976d2";
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public ICollection<Note> Notes { get; set; } = new List<Note>();
}
