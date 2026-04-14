namespace Harita.API.Entities;

public class NoteFile : BaseEntity
{
    public Guid NoteId { get; set; }
    public Note? Note { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public Guid UploadedByUserId { get; set; }
    public User? UploadedByUser { get; set; }
}
