namespace Harita.API.DTOs
{
    public class NoteCategoryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public int NoteCount { get; set; }
    }

    public class CreateNoteCategoryDto
    {
        public required string Name { get; set; }
        public string Color { get; set; } = "#1976d2";
    }

    public class NoteShareDto
    {
        public Guid Id { get; set; }
        public Guid SharedWithUserId { get; set; }
        public string SharedWithUserName { get; set; } = string.Empty;
        public bool CanEdit { get; set; }
    }

    public class NoteFileDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string ContentType { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }

    public class NoteListItemDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public Guid? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public string? CategoryColor { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? LastEditedByName { get; set; }
        public bool IsSharedWithMe { get; set; }
        public bool CanEdit { get; set; }
    }

    public class NoteDetailDto : NoteListItemDto
    {
        public string Content { get; set; } = string.Empty;
        public Guid OwnerUserId { get; set; }
        public string OwnerName { get; set; } = string.Empty;
        public List<NoteShareDto> Shares { get; set; } = new();
        public List<NoteFileDto> Files { get; set; } = new();
        public DateTime CreatedAt { get; set; }
    }

    public class CreateNoteDto
    {
        public string Title { get; set; } = "Yeni Not";
        public string Content { get; set; } = string.Empty;
        public Guid? CategoryId { get; set; }
    }

    public class UpdateNoteDto
    {
        public required string Title { get; set; }
        public string Content { get; set; } = string.Empty;
        public Guid? CategoryId { get; set; }
    }

    public class ShareNoteDto
    {
        public Guid SharedWithUserId { get; set; }
        public bool CanEdit { get; set; } = false;
    }
}
