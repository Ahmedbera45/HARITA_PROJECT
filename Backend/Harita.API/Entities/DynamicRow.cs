namespace Harita.API.Entities
{
    public class DynamicRow : BaseEntity
    {
        public Guid PageId { get; set; }
        public DynamicPage Page { get; set; } = null!;

        // JSON: { "Ada": "100", "Parsel": "5", "Ruhsat Tarihi": "2024-01-01", ... }
        public string Data { get; set; } = "{}";
    }
}
