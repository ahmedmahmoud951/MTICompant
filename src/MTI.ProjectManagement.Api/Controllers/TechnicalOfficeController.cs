using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/technical-office")]
[Authorize]
public class TechnicalOfficeController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IResourceAuthorizationService _resourceAuthorizationService;
    private readonly IAuditService _auditService;

    public TechnicalOfficeController(
        IAppDbContext context,
        ICurrentUserService currentUserService,
        IResourceAuthorizationService resourceAuthorizationService,
        IAuditService auditService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _resourceAuthorizationService = resourceAuthorizationService;
        _auditService = auditService;
    }

    private bool HasPermission(string permission)
    {
        return _currentUserService.IsAdmin ||
               _currentUserService.IsSystemAdmin ||
               _currentUserService.Permissions.Contains(permission);
    }

    private bool CanAccessTechnicalOffice()
    {
        var roles = _currentUserService.Roles;
        if (roles.Any(r =>
                string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(r, "SystemAdmin", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(r, "SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(r, "ProjectManager", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(r, "TechnicalOffice", StringComparison.OrdinalIgnoreCase)))
            return true;

        return HasPermission(Permissions.BoqView) ||
               HasPermission(Permissions.OffersView) ||
               HasPermission(Permissions.InvoicesView) ||
               HasPermission(Permissions.BoqManage);
    }

    // ==========================================
    // 1. BOQ (Bill of Quantities)
    // ==========================================

    [HttpGet("projects/{projectId:guid}/boq")]
    public async Task<ActionResult<ApiResponse<List<BoqItemDto>>>> GetProjectBoq(Guid projectId)
    {
        if (!CanAccessTechnicalOffice()) return Forbid();

        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, projectId);
        if (!canAccess) return Forbid();

        var items = await _context.BoqItems
            .Include(b => b.Site)
            .Where(b => b.ProjectId == projectId)
            .OrderBy(b => b.Category)
            .ThenBy(b => b.ItemCode)
            .Select(b => new BoqItemDto(
                b.Id,
                b.ProjectId,
                b.SiteId,
                b.Site != null ? b.Site.Name : null,
                b.ItemCode,
                b.Description,
                b.Unit,
                b.Quantity,
                b.UnitPrice,
                b.EstimatedCost,
                b.TotalPrice,
                b.Category,
                b.Notes,
                b.CreatedAt
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<BoqItemDto>>.Ok(items));
    }

    [HttpPost("boq")]
    public async Task<ActionResult<ApiResponse<BoqItemDto>>> CreateBoqItem([FromBody] CreateBoqItemRequest request)
    {
        if (!CanAccessTechnicalOffice()) return Forbid();
        if (!HasPermission(Permissions.BoqManage)) return Forbid();

        var project = await _context.Projects.FindAsync(request.ProjectId);
        if (project == null) return NotFound(ApiResponse<BoqItemDto>.Fail("Project not found."));

        var item = new BoqItem
        {
            ProjectId = request.ProjectId,
            SiteId = request.SiteId,
            ItemCode = request.ItemCode.Trim(),
            Description = request.Description.Trim(),
            Unit = request.Unit.Trim(),
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            EstimatedCost = request.EstimatedCost,
            Category = request.Category.Trim(),
            Notes = request.Notes?.Trim()
        };

        _context.BoqItems.Add(item);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("CreateBoqItem", "BoqItem", item.Id.ToString(), null, item);

        var dto = new BoqItemDto(
            item.Id,
            item.ProjectId,
            item.SiteId,
            null,
            item.ItemCode,
            item.Description,
            item.Unit,
            item.Quantity,
            item.UnitPrice,
            item.EstimatedCost,
            item.TotalPrice,
            item.Category,
            item.Notes,
            item.CreatedAt
        );

        return Ok(ApiResponse<BoqItemDto>.Ok(dto, "BOQ item created successfully."));
    }

    [HttpPut("boq/{id:guid}")]
    public async Task<ActionResult<ApiResponse<BoqItemDto>>> UpdateBoqItem(Guid id, [FromBody] UpdateBoqItemRequest request)
    {
        if (!CanAccessTechnicalOffice()) return Forbid();
        if (!HasPermission(Permissions.BoqManage)) return Forbid();

        var item = await _context.BoqItems.FindAsync(id);
        if (item == null) return NotFound(ApiResponse<BoqItemDto>.Fail("BOQ item not found."));

        var old = new { item.Description, item.Unit, item.Quantity, item.UnitPrice, item.EstimatedCost, item.Category };

        item.Description = request.Description.Trim();
        item.Unit = request.Unit.Trim();
        item.Quantity = request.Quantity;
        item.UnitPrice = request.UnitPrice;
        item.EstimatedCost = request.EstimatedCost;
        item.Category = request.Category.Trim();
        item.Notes = request.Notes?.Trim();

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("UpdateBoqItem", "BoqItem", id.ToString(), old, request);

        var dto = new BoqItemDto(
            item.Id,
            item.ProjectId,
            item.SiteId,
            null,
            item.ItemCode,
            item.Description,
            item.Unit,
            item.Quantity,
            item.UnitPrice,
            item.EstimatedCost,
            item.TotalPrice,
            item.Category,
            item.Notes,
            item.CreatedAt
        );

        return Ok(ApiResponse<BoqItemDto>.Ok(dto, "BOQ item updated successfully."));
    }

    [HttpDelete("boq/{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteBoqItem(Guid id)
    {
        if (!CanAccessTechnicalOffice()) return Forbid();
        if (!HasPermission(Permissions.BoqManage)) return Forbid();

        var item = await _context.BoqItems.FindAsync(id);
        if (item == null) return NotFound(ApiResponse<bool>.Fail("BOQ item not found."));

        _context.BoqItems.Remove(item);
        await _context.SaveChangesAsync();
        await _auditService.LogAsync("DeleteBoqItem", "BoqItem", id.ToString());

        return Ok(ApiResponse<bool>.Ok(true, "BOQ item deleted."));
    }

    // ==========================================
    // 2. Technical & Commercial Offers
    // ==========================================

    [HttpGet("projects/{projectId:guid}/technical-offers")]
    public async Task<ActionResult<ApiResponse<List<TechnicalOfferDto>>>> GetTechnicalOffers(Guid projectId)
    {
        if (!CanAccessTechnicalOffice()) return Forbid();

        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, projectId);
        if (!canAccess) return Forbid();

        var list = await _context.TechnicalOffers
            .Include(t => t.Project)
            .Where(t => t.ProjectId == projectId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TechnicalOfferDto(
                t.Id,
                t.ProjectId,
                t.Project.Name,
                t.Title,
                t.ScopeOfWork,
                t.SpecificationsJson,
                t.Deliverables,
                t.Status,
                t.Version,
                t.DocumentMediaFileId,
                t.CreatedAt
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<TechnicalOfferDto>>.Ok(list));
    }

    [HttpPost("technical-offers")]
    public async Task<ActionResult<ApiResponse<TechnicalOfferDto>>> CreateTechnicalOffer([FromBody] CreateTechnicalOfferRequest request)
    {
        if (!CanAccessTechnicalOffice()) return Forbid();
        if (!HasPermission(Permissions.OffersManage)) return Forbid();

        var project = await _context.Projects.FindAsync(request.ProjectId);
        if (project == null) return NotFound(ApiResponse<TechnicalOfferDto>.Fail("Project not found."));

        var offer = new TechnicalOffer
        {
            ProjectId = request.ProjectId,
            Title = request.Title.Trim(),
            ScopeOfWork = request.ScopeOfWork.Trim(),
            SpecificationsJson = request.SpecificationsJson ?? "[]",
            Deliverables = request.Deliverables.Trim(),
            Status = OfferStatus.Draft,
            Version = 1,
            DocumentMediaFileId = request.DocumentMediaFileId
        };

        _context.TechnicalOffers.Add(offer);
        await _context.SaveChangesAsync();
        await _auditService.LogAsync("CreateTechnicalOffer", "TechnicalOffer", offer.Id.ToString(), null, offer);

        var dto = new TechnicalOfferDto(
            offer.Id,
            offer.ProjectId,
            project.Name,
            offer.Title,
            offer.ScopeOfWork,
            offer.SpecificationsJson,
            offer.Deliverables,
            offer.Status,
            offer.Version,
            offer.DocumentMediaFileId,
            offer.CreatedAt
        );

        return Ok(ApiResponse<TechnicalOfferDto>.Ok(dto, "Technical offer created."));
    }

    [HttpGet("projects/{projectId:guid}/commercial-offers")]
    public async Task<ActionResult<ApiResponse<List<CommercialOfferDto>>>> GetCommercialOffers(Guid projectId)
    {
        if (!CanAccessTechnicalOffice()) return Forbid();

        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, projectId);
        if (!canAccess) return Forbid();

        var list = await _context.CommercialOffers
            .Include(c => c.Project)
            .Where(c => c.ProjectId == projectId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CommercialOfferDto(
                c.Id,
                c.ProjectId,
                c.Project.Name,
                c.Title,
                c.TotalAmount,
                c.Discount,
                c.Tax,
                c.FinalAmount,
                c.Currency,
                c.PaymentTerms,
                c.ValidityDays,
                c.Status,
                c.Version,
                c.DocumentMediaFileId,
                c.CreatedAt
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<CommercialOfferDto>>.Ok(list));
    }

    [HttpPost("commercial-offers")]
    public async Task<ActionResult<ApiResponse<CommercialOfferDto>>> CreateCommercialOffer([FromBody] CreateCommercialOfferRequest request)
    {
        if (!CanAccessTechnicalOffice()) return Forbid();
        if (!HasPermission(Permissions.OffersManage)) return Forbid();

        var project = await _context.Projects.FindAsync(request.ProjectId);
        if (project == null) return NotFound(ApiResponse<CommercialOfferDto>.Fail("Project not found."));

        var offer = new CommercialOffer
        {
            ProjectId = request.ProjectId,
            Title = request.Title.Trim(),
            TotalAmount = request.TotalAmount,
            Discount = request.Discount,
            Tax = request.Tax,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "EGP" : request.Currency.Trim(),
            PaymentTerms = request.PaymentTerms.Trim(),
            ValidityDays = request.ValidityDays > 0 ? request.ValidityDays : 30,
            Status = OfferStatus.Draft,
            Version = 1,
            DocumentMediaFileId = request.DocumentMediaFileId
        };

        _context.CommercialOffers.Add(offer);
        await _context.SaveChangesAsync();
        await _auditService.LogAsync("CreateCommercialOffer", "CommercialOffer", offer.Id.ToString(), null, offer);

        var dto = new CommercialOfferDto(
            offer.Id,
            offer.ProjectId,
            project.Name,
            offer.Title,
            offer.TotalAmount,
            offer.Discount,
            offer.Tax,
            offer.FinalAmount,
            offer.Currency,
            offer.PaymentTerms,
            offer.ValidityDays,
            offer.Status,
            offer.Version,
            offer.DocumentMediaFileId,
            offer.CreatedAt
        );

        return Ok(ApiResponse<CommercialOfferDto>.Ok(dto, "Commercial offer created."));
    }

    // ==========================================
    // 3. Project Invoices
    // ==========================================

    [HttpGet("projects/{projectId:guid}/invoices")]
    public async Task<ActionResult<ApiResponse<List<ProjectInvoiceDto>>>> GetProjectInvoices(Guid projectId)
    {
        if (!CanAccessTechnicalOffice()) return Forbid();

        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, projectId);
        if (!canAccess) return Forbid();

        var list = await _context.ProjectInvoices
            .Include(i => i.Project)
            .Where(i => i.ProjectId == projectId)
            .OrderByDescending(i => i.IssuedDate)
            .Select(i => new ProjectInvoiceDto(
                i.Id,
                i.ProjectId,
                i.Project.Name,
                i.InvoiceNumber,
                i.MilestoneDescription,
                i.Amount,
                i.Currency,
                i.IssuedDate,
                i.DueDate,
                i.PaidDate,
                i.Status,
                i.Notes,
                i.AttachmentMediaFileId,
                i.CreatedAt
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<ProjectInvoiceDto>>.Ok(list));
    }

    [HttpPost("invoices")]
    public async Task<ActionResult<ApiResponse<ProjectInvoiceDto>>> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        if (!CanAccessTechnicalOffice()) return Forbid();
        if (!HasPermission(Permissions.InvoicesManage)) return Forbid();

        var project = await _context.Projects.FindAsync(request.ProjectId);
        if (project == null) return NotFound(ApiResponse<ProjectInvoiceDto>.Fail("Project not found."));

        var inv = new ProjectInvoice
        {
            ProjectId = request.ProjectId,
            InvoiceNumber = request.InvoiceNumber.Trim(),
            MilestoneDescription = request.MilestoneDescription.Trim(),
            Amount = request.Amount,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "EGP" : request.Currency.Trim(),
            IssuedDate = request.IssuedDate,
            DueDate = request.DueDate,
            Status = InvoiceStatus.Issued,
            Notes = request.Notes?.Trim(),
            AttachmentMediaFileId = request.AttachmentMediaFileId
        };

        _context.ProjectInvoices.Add(inv);
        await _context.SaveChangesAsync();
        await _auditService.LogAsync("CreateInvoice", "ProjectInvoice", inv.Id.ToString(), null, inv);

        var dto = new ProjectInvoiceDto(
            inv.Id,
            inv.ProjectId,
            project.Name,
            inv.InvoiceNumber,
            inv.MilestoneDescription,
            inv.Amount,
            inv.Currency,
            inv.IssuedDate,
            inv.DueDate,
            inv.PaidDate,
            inv.Status,
            inv.Notes,
            inv.AttachmentMediaFileId,
            inv.CreatedAt
        );

        return Ok(ApiResponse<ProjectInvoiceDto>.Ok(dto, "Invoice issued."));
    }

    [HttpPut("invoices/{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateInvoiceStatus(Guid id, [FromBody] UpdateInvoiceStatusRequest request)
    {
        if (!CanAccessTechnicalOffice()) return Forbid();
        if (!HasPermission(Permissions.InvoicesManage)) return Forbid();

        var inv = await _context.ProjectInvoices.FindAsync(id);
        if (inv == null) return NotFound(ApiResponse<bool>.Fail("Invoice not found."));

        var old = new { inv.Status, inv.PaidDate };
        inv.Status = request.Status;
        if (request.Status == InvoiceStatus.Paid)
        {
            inv.PaidDate = request.PaidDate ?? DateTime.UtcNow;
        }
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            inv.Notes = request.Notes.Trim();
        }

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("UpdateInvoiceStatus", "ProjectInvoice", id.ToString(), old, request);

        return Ok(ApiResponse<bool>.Ok(true, "Invoice status updated."));
    }
}
