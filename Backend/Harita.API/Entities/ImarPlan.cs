namespace Harita.API.Entities;

public class ImarPlan : BaseEntity
{
    public string PlanNo { get; set; } = string.Empty;
    public string PlanAdi { get; set; } = string.Empty;
    public string PlanTuru { get; set; } = string.Empty;
    public string? Mahalle { get; set; }
    public string? Ada { get; set; }
    public string? Parsel { get; set; }
    public decimal? YuzolcumHa { get; set; }
    public string? Konu { get; set; }
    public DateTime? OnayTarihi { get; set; }
    public string? OnayMakami { get; set; }
    public string Durum { get; set; } = "Yürürlükte";
    public string? Aciklama { get; set; }
    public Guid CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<ImarPlanEk> Ekler { get; set; } = new List<ImarPlanEk>();
}
