--
-- PostgreSQL database dump
--

\restrict QFzL0Hk27mDtbpQ2XE4S1i05LIOZ0VMSWHDZsPbpjkGtMd6Me82A9Kg5ESy3ypf

-- Dumped from database version 15.15 (Homebrew)
-- Dumped by pg_dump version 15.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ContractStatus; Type: TYPE; Schema: public; Owner: vendorapp
--

CREATE TYPE public."ContractStatus" AS ENUM (
    'draft',
    'active',
    'expired',
    'terminated'
);


ALTER TYPE public."ContractStatus" OWNER TO vendorapp;

--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: vendorapp
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'pending',
    'validated',
    'disputed',
    'paid'
);


ALTER TYPE public."InvoiceStatus" OWNER TO vendorapp;

--
-- Name: PermissionLevel; Type: TYPE; Schema: public; Owner: vendorapp
--

CREATE TYPE public."PermissionLevel" AS ENUM (
    'denied',
    'view',
    'write',
    'admin'
);


ALTER TYPE public."PermissionLevel" OWNER TO vendorapp;

--
-- Name: TeamMemberStatus; Type: TYPE; Schema: public; Owner: vendorapp
--

CREATE TYPE public."TeamMemberStatus" AS ENUM (
    'active',
    'inactive',
    'onboarding',
    'offboarded'
);


ALTER TYPE public."TeamMemberStatus" OWNER TO vendorapp;

--
-- Name: TimeOffCode; Type: TYPE; Schema: public; Owner: vendorapp
--

CREATE TYPE public."TimeOffCode" AS ENUM (
    'VAC',
    'HALF',
    'SICK',
    'MAT',
    'CAS',
    'UNPAID'
);


ALTER TYPE public."TimeOffCode" OWNER TO vendorapp;

--
-- Name: VendorStatus; Type: TYPE; Schema: public; Owner: vendorapp
--

CREATE TYPE public."VendorStatus" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE public."VendorStatus" OWNER TO vendorapp;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: contract_analyses; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.contract_analyses (
    id text NOT NULL,
    "contractId" text NOT NULL,
    "expirationDate" text,
    "renewalTerms" text,
    sla text,
    "paymentTerms" text,
    "noticePeriod" text,
    "keyContacts" text,
    "scopeSummary" text,
    "terminationClauses" text,
    "confidenceScores" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "analyzedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.contract_analyses OWNER TO vendorapp;

--
-- Name: contract_tags; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.contract_tags (
    "contractId" text NOT NULL,
    "tagId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.contract_tags OWNER TO vendorapp;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.contracts (
    id text NOT NULL,
    "vendorId" text NOT NULL,
    title text NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    value numeric(14,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    status public."ContractStatus" DEFAULT 'draft'::public."ContractStatus" NOT NULL,
    "documentUrl" text,
    "documentKey" text,
    "documentName" text,
    "documentSize" integer,
    "documentType" text,
    "documentUploadedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.contracts OWNER TO vendorapp;

--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.exchange_rates (
    id text NOT NULL,
    "fromCurrency" character varying(3) NOT NULL,
    "toCurrency" character varying(3) NOT NULL,
    rate numeric(12,6) NOT NULL,
    "lastUpdated" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.exchange_rates OWNER TO vendorapp;

--
-- Name: invoice_tags; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.invoice_tags (
    "invoiceId" text NOT NULL,
    "tagId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.invoice_tags OWNER TO vendorapp;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    "vendorId" text NOT NULL,
    "invoiceNumber" text NOT NULL,
    "invoiceDate" date NOT NULL,
    "billingPeriodStart" date NOT NULL,
    "billingPeriodEnd" date NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    status public."InvoiceStatus" DEFAULT 'pending'::public."InvoiceStatus" NOT NULL,
    "expectedAmount" numeric(14,2),
    discrepancy numeric(14,2),
    "toleranceThreshold" numeric(5,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.invoices OWNER TO vendorapp;

--
-- Name: rate_cards; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.rate_cards (
    id text NOT NULL,
    "vendorId" text NOT NULL,
    "roleId" text NOT NULL,
    rate numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.rate_cards OWNER TO vendorapp;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.roles (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.roles OWNER TO vendorapp;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.system_settings (
    id text NOT NULL,
    category character varying(50) NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    description text,
    "updatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.system_settings OWNER TO vendorapp;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.tags (
    id text NOT NULL,
    name text NOT NULL,
    color character varying(7),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tags OWNER TO vendorapp;

--
-- Name: team_member_tags; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.team_member_tags (
    "teamMemberId" text NOT NULL,
    "tagId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.team_member_tags OWNER TO vendorapp;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.team_members (
    id text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    email text NOT NULL,
    "vendorId" text NOT NULL,
    "roleId" text NOT NULL,
    "dailyRate" numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    status public."TeamMemberStatus" DEFAULT 'active'::public."TeamMemberStatus" NOT NULL,
    "plannedUtilization" numeric(5,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.team_members OWNER TO vendorapp;

--
-- Name: timesheet_entries; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.timesheet_entries (
    id text NOT NULL,
    "teamMemberId" text NOT NULL,
    date date NOT NULL,
    hours numeric(4,2),
    "timeOffCode" public."TimeOffCode",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.timesheet_entries OWNER TO vendorapp;

--
-- Name: users; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    "permissionLevel" public."PermissionLevel" DEFAULT 'view'::public."PermissionLevel" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO vendorapp;

--
-- Name: vendor_tags; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.vendor_tags (
    "vendorId" text NOT NULL,
    "tagId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.vendor_tags OWNER TO vendorapp;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: vendorapp
--

CREATE TABLE public.vendors (
    id text NOT NULL,
    name text NOT NULL,
    address text,
    location text,
    "serviceDescription" text,
    status public."VendorStatus" DEFAULT 'active'::public."VendorStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vendors OWNER TO vendorapp;

--
-- Name: contract_analyses contract_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.contract_analyses
    ADD CONSTRAINT contract_analyses_pkey PRIMARY KEY (id);


--
-- Name: contract_tags contract_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.contract_tags
    ADD CONSTRAINT contract_tags_pkey PRIMARY KEY ("contractId", "tagId");


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: invoice_tags invoice_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.invoice_tags
    ADD CONSTRAINT invoice_tags_pkey PRIMARY KEY ("invoiceId", "tagId");


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: rate_cards rate_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT rate_cards_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: team_member_tags team_member_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.team_member_tags
    ADD CONSTRAINT team_member_tags_pkey PRIMARY KEY ("teamMemberId", "tagId");


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: timesheet_entries timesheet_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.timesheet_entries
    ADD CONSTRAINT timesheet_entries_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendor_tags vendor_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.vendor_tags
    ADD CONSTRAINT vendor_tags_pkey PRIMARY KEY ("vendorId", "tagId");


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: contract_analyses_analyzedAt_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "contract_analyses_analyzedAt_idx" ON public.contract_analyses USING btree ("analyzedAt");


--
-- Name: contract_analyses_contractId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "contract_analyses_contractId_idx" ON public.contract_analyses USING btree ("contractId");


--
-- Name: contract_analyses_contractId_key; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE UNIQUE INDEX "contract_analyses_contractId_key" ON public.contract_analyses USING btree ("contractId");


--
-- Name: contract_tags_contractId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "contract_tags_contractId_idx" ON public.contract_tags USING btree ("contractId");


--
-- Name: contract_tags_tagId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "contract_tags_tagId_idx" ON public.contract_tags USING btree ("tagId");


--
-- Name: contracts_endDate_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "contracts_endDate_idx" ON public.contracts USING btree ("endDate");


--
-- Name: contracts_startDate_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "contracts_startDate_idx" ON public.contracts USING btree ("startDate");


--
-- Name: contracts_status_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX contracts_status_idx ON public.contracts USING btree (status);


--
-- Name: contracts_title_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX contracts_title_idx ON public.contracts USING btree (title);


--
-- Name: contracts_vendorId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "contracts_vendorId_idx" ON public.contracts USING btree ("vendorId");


--
-- Name: exchange_rates_fromCurrency_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "exchange_rates_fromCurrency_idx" ON public.exchange_rates USING btree ("fromCurrency");


--
-- Name: exchange_rates_fromCurrency_toCurrency_key; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE UNIQUE INDEX "exchange_rates_fromCurrency_toCurrency_key" ON public.exchange_rates USING btree ("fromCurrency", "toCurrency");


--
-- Name: exchange_rates_lastUpdated_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "exchange_rates_lastUpdated_idx" ON public.exchange_rates USING btree ("lastUpdated");


--
-- Name: exchange_rates_toCurrency_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "exchange_rates_toCurrency_idx" ON public.exchange_rates USING btree ("toCurrency");


--
-- Name: invoice_tags_invoiceId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "invoice_tags_invoiceId_idx" ON public.invoice_tags USING btree ("invoiceId");


--
-- Name: invoice_tags_tagId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "invoice_tags_tagId_idx" ON public.invoice_tags USING btree ("tagId");


--
-- Name: invoices_billingPeriodEnd_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "invoices_billingPeriodEnd_idx" ON public.invoices USING btree ("billingPeriodEnd");


--
-- Name: invoices_billingPeriodStart_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "invoices_billingPeriodStart_idx" ON public.invoices USING btree ("billingPeriodStart");


--
-- Name: invoices_invoiceDate_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "invoices_invoiceDate_idx" ON public.invoices USING btree ("invoiceDate");


--
-- Name: invoices_invoiceNumber_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "invoices_invoiceNumber_idx" ON public.invoices USING btree ("invoiceNumber");


--
-- Name: invoices_invoiceNumber_key; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON public.invoices USING btree ("invoiceNumber");


--
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);


--
-- Name: invoices_vendorId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "invoices_vendorId_idx" ON public.invoices USING btree ("vendorId");


--
-- Name: rate_cards_currency_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX rate_cards_currency_idx ON public.rate_cards USING btree (currency);


--
-- Name: rate_cards_effectiveFrom_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "rate_cards_effectiveFrom_idx" ON public.rate_cards USING btree ("effectiveFrom");


--
-- Name: rate_cards_effectiveTo_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "rate_cards_effectiveTo_idx" ON public.rate_cards USING btree ("effectiveTo");


--
-- Name: rate_cards_roleId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "rate_cards_roleId_idx" ON public.rate_cards USING btree ("roleId");


--
-- Name: rate_cards_vendorId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "rate_cards_vendorId_idx" ON public.rate_cards USING btree ("vendorId");


--
-- Name: rate_cards_vendorId_roleId_effectiveFrom_key; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE UNIQUE INDEX "rate_cards_vendorId_roleId_effectiveFrom_key" ON public.rate_cards USING btree ("vendorId", "roleId", "effectiveFrom");


--
-- Name: roles_name_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX roles_name_idx ON public.roles USING btree (name);


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: system_settings_category_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX system_settings_category_idx ON public.system_settings USING btree (category);


--
-- Name: system_settings_category_key_key; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE UNIQUE INDEX system_settings_category_key_key ON public.system_settings USING btree (category, key);


--
-- Name: system_settings_key_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX system_settings_key_idx ON public.system_settings USING btree (key);


--
-- Name: tags_name_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX tags_name_idx ON public.tags USING btree (name);


--
-- Name: tags_name_key; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE UNIQUE INDEX tags_name_key ON public.tags USING btree (name);


--
-- Name: team_member_tags_tagId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "team_member_tags_tagId_idx" ON public.team_member_tags USING btree ("tagId");


--
-- Name: team_member_tags_teamMemberId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "team_member_tags_teamMemberId_idx" ON public.team_member_tags USING btree ("teamMemberId");


--
-- Name: team_members_email_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX team_members_email_idx ON public.team_members USING btree (email);


--
-- Name: team_members_email_key; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE UNIQUE INDEX team_members_email_key ON public.team_members USING btree (email);


--
-- Name: team_members_endDate_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "team_members_endDate_idx" ON public.team_members USING btree ("endDate");


--
-- Name: team_members_roleId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "team_members_roleId_idx" ON public.team_members USING btree ("roleId");


--
-- Name: team_members_startDate_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "team_members_startDate_idx" ON public.team_members USING btree ("startDate");


--
-- Name: team_members_status_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX team_members_status_idx ON public.team_members USING btree (status);


--
-- Name: team_members_vendorId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "team_members_vendorId_idx" ON public.team_members USING btree ("vendorId");


--
-- Name: timesheet_entries_date_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX timesheet_entries_date_idx ON public.timesheet_entries USING btree (date);


--
-- Name: timesheet_entries_teamMemberId_date_key; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE UNIQUE INDEX "timesheet_entries_teamMemberId_date_key" ON public.timesheet_entries USING btree ("teamMemberId", date);


--
-- Name: timesheet_entries_teamMemberId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "timesheet_entries_teamMemberId_idx" ON public.timesheet_entries USING btree ("teamMemberId");


--
-- Name: timesheet_entries_timeOffCode_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "timesheet_entries_timeOffCode_idx" ON public.timesheet_entries USING btree ("timeOffCode");


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_isActive_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "users_isActive_idx" ON public.users USING btree ("isActive");


--
-- Name: users_permissionLevel_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "users_permissionLevel_idx" ON public.users USING btree ("permissionLevel");


--
-- Name: vendor_tags_tagId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "vendor_tags_tagId_idx" ON public.vendor_tags USING btree ("tagId");


--
-- Name: vendor_tags_vendorId_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "vendor_tags_vendorId_idx" ON public.vendor_tags USING btree ("vendorId");


--
-- Name: vendors_createdAt_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX "vendors_createdAt_idx" ON public.vendors USING btree ("createdAt");


--
-- Name: vendors_name_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX vendors_name_idx ON public.vendors USING btree (name);


--
-- Name: vendors_status_idx; Type: INDEX; Schema: public; Owner: vendorapp
--

CREATE INDEX vendors_status_idx ON public.vendors USING btree (status);


--
-- Name: contract_analyses contract_analyses_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.contract_analyses
    ADD CONSTRAINT "contract_analyses_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contract_tags contract_tags_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.contract_tags
    ADD CONSTRAINT "contract_tags_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contract_tags contract_tags_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.contract_tags
    ADD CONSTRAINT "contract_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contracts contracts_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "contracts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoice_tags invoice_tags_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.invoice_tags
    ADD CONSTRAINT "invoice_tags_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoice_tags invoice_tags_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.invoice_tags
    ADD CONSTRAINT "invoice_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoices invoices_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rate_cards rate_cards_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT "rate_cards_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rate_cards rate_cards_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT "rate_cards_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: team_member_tags team_member_tags_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.team_member_tags
    ADD CONSTRAINT "team_member_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: team_member_tags team_member_tags_teamMemberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.team_member_tags
    ADD CONSTRAINT "team_member_tags_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES public.team_members(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: team_members team_members_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT "team_members_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: team_members team_members_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT "team_members_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: timesheet_entries timesheet_entries_teamMemberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.timesheet_entries
    ADD CONSTRAINT "timesheet_entries_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES public.team_members(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vendor_tags vendor_tags_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.vendor_tags
    ADD CONSTRAINT "vendor_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vendor_tags vendor_tags_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vendorapp
--

ALTER TABLE ONLY public.vendor_tags
    ADD CONSTRAINT "vendor_tags_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict QFzL0Hk27mDtbpQ2XE4S1i05LIOZ0VMSWHDZsPbpjkGtMd6Me82A9Kg5ESy3ypf

