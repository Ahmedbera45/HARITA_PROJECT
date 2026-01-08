using Harita.API.Entities;
public class Directory : BaseEntity
{
    public string Name { get; set; }
    public string Title { get; set; }
    public string Institution { get; set; }
    public string Unit { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public string Tags { get; set; }
}