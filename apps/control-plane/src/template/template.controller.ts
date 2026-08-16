import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { TemplateService } from "./template.service.js";

@Controller()
export class TemplateController {
  constructor(
    @Inject(TemplateService) private readonly templates: TemplateService,
  ) {}

  @Get("workspaces/local/curated-templates")
  listCuratedTemplates() {
    return this.templates.listCuratedTemplates();
  }

  @Post("workspaces/local/curated-templates/:templateKey/instances")
  instantiateCuratedTemplate(
    @Param("templateKey") templateKey: string,
    @Body() body: unknown,
  ) {
    return this.templates.instantiateCuratedTemplate(templateKey, body);
  }

  @Get("workspaces/local/template-draft-instances/:applicationKey")
  openTemplateDraft(@Param("applicationKey") applicationKey: string) {
    return this.templates.openTemplateDraft(applicationKey);
  }

  @Post("template-draft-instances/:applicationGraphId/revisions")
  appendTemplateDraftRevision(
    @Param("applicationGraphId") applicationGraphId: string,
    @Body() body: unknown,
  ) {
    return this.templates.appendTemplateDraftRevision(applicationGraphId, body);
  }

  @Post("template-draft-instances/:applicationGraphId/page-revisions")
  appendTemplatePageRevision(
    @Param("applicationGraphId") applicationGraphId: string,
    @Body() body: unknown,
  ) {
    return this.templates.appendTemplatePageRevision(applicationGraphId, body);
  }

  @Post(
    "template-draft-instances/:applicationGraphId/page-block-order-revisions",
  )
  appendTemplatePageBlockOrderRevision(
    @Param("applicationGraphId") applicationGraphId: string,
    @Body() body: unknown,
  ) {
    return this.templates.appendTemplatePageBlockOrderRevision(
      applicationGraphId,
      body,
    );
  }

  @Post("template-draft-instances/:applicationGraphId/data-field-revisions")
  appendTemplateDataFieldRevision(
    @Param("applicationGraphId") applicationGraphId: string,
    @Body() body: unknown,
  ) {
    return this.templates.appendTemplateDataFieldRevision(
      applicationGraphId,
      body,
    );
  }

  @Post(
    "template-draft-instances/:applicationGraphId/experience-theme-revisions",
  )
  appendTemplateExperienceThemeRevision(
    @Param("applicationGraphId") applicationGraphId: string,
    @Body() body: unknown,
  ) {
    return this.templates.appendTemplateExperienceThemeRevision(
      applicationGraphId,
      body,
    );
  }

  @Post("template-draft-instances/:applicationGraphId/access-revisions")
  appendTemplateAccessRevision(
    @Param("applicationGraphId") applicationGraphId: string,
    @Body() body: unknown,
  ) {
    return this.templates.appendTemplateAccessRevision(
      applicationGraphId,
      body,
    );
  }
}
