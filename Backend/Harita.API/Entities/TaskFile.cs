namespace Harita.API.Entities;

public class TaskFile : BaseEntity
{
    public Guid TaskId { get; set; }
    public AppTask? Task { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public Guid UploadedByUserId { get; set; }
    public User? UploadedByUser { get; set; }
}
