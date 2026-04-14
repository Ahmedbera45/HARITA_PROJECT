namespace Harita.API.Entities;

public class Note : BaseEntity
{
    public string Title { get; set; } = "Yeni Not";
    public string Content { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public Guid? CategoryId { get; set; }
    public NoteCategory? Category { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? LastEditedByUserId { get; set; }
    public User? LastEditedByUser { get; set; }
    public ICollection<NoteShare> Shares { get; set; } = new List<NoteShare>();
    public ICollection<NoteFile> Files { get; set; } = new List<NoteFile>();
}
