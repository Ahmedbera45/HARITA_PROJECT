namespace Harita.API.Entities
{
    public class DynamicPage : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;  // URL-friendly isim
        public string? Description { get; set; }

        // Satır eklerken Ada+Parsel ile DB eşleştirmesi aktif mi?
        public bool ParcelMatching { get; set; } = false;

        public Guid CreatedByUserId { get; set; }
        public User CreatedByUser { get; set; } = null!;

        public ICollection<DynamicColumn> Columns { get; set; } = new List<DynamicColumn>();
        public ICollection<DynamicRow> Rows { get; set; } = new List<DynamicRow>();
    }
}
