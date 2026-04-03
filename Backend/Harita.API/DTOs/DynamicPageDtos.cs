namespace Harita.API.DTOs
{
    public class CreateColumnDto
    {
        public required string Name { get; set; }
        public string Type { get; set; } = "text";  // text | number | date
        public int Order { get; set; }
    }

    public class AddColumnDto
    {
        public required string Name { get; set; }
        public string Type { get; set; } = "text";
    }

    public class CreateDynamicPageDto
    {
        public required string Title { get; set; }
        public string? Description { get; set; }
        public bool ParcelMatching { get; set; } = false;
        public List<CreateColumnDto> Columns { get; set; } = new();
    }

    public class DynamicColumnDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int Order { get; set; }
    }

    public class DynamicPageDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool ParcelMatching { get; set; }
        public List<DynamicColumnDto> Columns { get; set; } = new();
        public int RowCount { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class DynamicRowDto
    {
        public Guid Id { get; set; }
        public Dictionary<string, string> Data { get; set; } = new();
    }

    public class DynamicPageDetailDto : DynamicPageDto
    {
        public List<DynamicRowDto> Rows { get; set; } = new();
    }

    public class UpsertRowDto
    {
        public Dictionary<string, string> Data { get; set; } = new();
    }
}
