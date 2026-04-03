namespace Harita.API.Entities;

public class ImarPlanEk : BaseEntity
{
    public Guid ImarPlanId { get; set; }
    public ImarPlan? ImarPlan { get; set; }
    // Kullanıcıya gösterilen isim (örn. "Plan Paftası 2024")
    public string DosyaAdi { get; set; } = string.Empty;
    // Arşivde göreli yol (basePath'e göre) veya tam UNC yol
    public string DosyaYolu { get; set; } = string.Empty;
    public string? DosyaTuru { get; set; }
    public string? Aciklama { get; set; }
    public Guid EkleyenId { get; set; }
    public User? Ekleyen { get; set; }
}
