namespace Harita.API.Entities
{
    public class ParcelCustomField : BaseEntity
    {
        public string FieldKey { get; set; } = "";      // kod adı: "BagYola", "Irtifa"
        public string DisplayName { get; set; } = "";   // gösterilen ad: "Bağ Yola Mesafe"
        public string FieldType { get; set; } = "text"; // "text" | "number" | "date"
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
