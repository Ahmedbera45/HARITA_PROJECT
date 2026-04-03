namespace Harita.API.Entities
{
    public class DynamicColumn : BaseEntity
    {
        public Guid PageId { get; set; }
        public DynamicPage Page { get; set; } = null!;

        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "text";  // text | number | date
        public int Order { get; set; }
    }
}
