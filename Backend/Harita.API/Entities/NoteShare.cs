namespace Harita.API.Entities;

public class NoteShare
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid NoteId { get; set; }
    public Note? Note { get; set; }
    public Guid SharedWithUserId { get; set; }
    public User? SharedWithUser { get; set; }
    public bool CanEdit { get; set; } = false;
    public DateTime SharedAt { get; set; } = DateTime.UtcNow;
}
