--
-- PostgreSQL database dump
--

\restrict LTiAueYVHNVG5fti2Tpdmvop4Ll9gJuzCdN4uHwmJ0xzClk23AzwIbjqUBDnAcK

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
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: francesco
--

INSERT INTO public.vendors VALUES ('cmke67l8a0000swr19gl9wlfq', 'Deltatre', NULL, 'London', NULL, 'active', '2026-01-14 15:23:35.098', '2026-01-14 15:23:35.098');
INSERT INTO public.vendors VALUES ('cmke67q7j0001swr1eqhv7smz', 'LTIMindtree', NULL, NULL, NULL, 'active', '2026-01-14 15:23:41.551', '2026-01-14 15:23:41.551');


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: francesco
--



--
-- Data for Name: contract_analyses; Type: TABLE DATA; Schema: public; Owner: francesco
--



--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: francesco
--



--
-- Data for Name: contract_tags; Type: TABLE DATA; Schema: public; Owner: francesco
--



--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: francesco
--



--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: francesco
--



--
-- Data for Name: invoice_tags; Type: TABLE DATA; Schema: public; Owner: francesco
--



--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: francesco
--

INSERT INTO public.roles VALUES ('b934cf44-10fa-436a-b6d9-bda5ac1e3248', 'iOS Developer', NULL, '2026-01-14 15:25:42.364', '2026-01-14 15:25:42.364');
INSERT INTO public.roles VALUES ('2f6bb176-d38f-4573-988f-bfe3169cfc4a', 'QA Engineer', NULL, '2026-01-14 15:25:42.364', '2026-01-14 15:25:42.364');
INSERT INTO public.roles VALUES ('fe44d809-0840-49d3-ab8c-97d1f56da370', 'Project Manager', NULL, '2026-01-14 15:25:42.364', '2026-01-14 15:25:42.364');
INSERT INTO public.roles VALUES ('6becee3e-8d93-437b-a852-41115cd82d2b', 'Web Developer', NULL, '2026-01-14 15:25:42.364', '2026-01-14 15:25:42.364');
INSERT INTO public.roles VALUES ('4e4cc41b-8f90-4cde-9e8f-5c10064f075a', 'Web TV Developer', NULL, '2026-01-14 15:25:42.364', '2026-01-14 15:25:42.364');
INSERT INTO public.roles VALUES ('bbc8136c-1152-4046-a621-dfa3ff788dd8', 'Android Developer', NULL, '2026-01-14 15:25:42.364', '2026-01-14 15:25:42.364');
INSERT INTO public.roles VALUES ('cmke6b6fq0002swr1t93q9wqf', 'Technical Director', NULL, '2026-01-14 15:26:22.55', '2026-01-14 15:26:22.55');
INSERT INTO public.roles VALUES ('cmkfgi8z20000fgxxutr6lz0r', 'Scrum Master', NULL, '2026-01-15 12:59:34.767', '2026-01-15 12:59:34.767');
INSERT INTO public.roles VALUES ('cmkfgmexz0003fgxxrdbo2e74', 'Lead FE engineer - Web TV', NULL, '2026-01-15 13:02:49.128', '2026-01-15 13:02:49.128');
INSERT INTO public.roles VALUES ('cmkfgmws30004fgxxjkbag8ee', 'Senior Engineer - Web TV', NULL, '2026-01-15 13:03:12.243', '2026-01-15 13:03:12.243');
INSERT INTO public.roles VALUES ('cmkfgq83h0006fgxxns56372i', 'Senior Engineer - tvOS', NULL, '2026-01-15 13:05:46.877', '2026-01-15 13:05:46.877');
INSERT INTO public.roles VALUES ('cmkfgqzzr0007fgxxglkag4tl', 'Senior Engineer - Android TV', NULL, '2026-01-15 13:06:23.032', '2026-01-15 13:06:23.032');
INSERT INTO public.roles VALUES ('cmkfgtswe0008fgxxolprbizv', 'Senior Engineer - Roku', NULL, '2026-01-15 13:08:33.807', '2026-01-15 13:08:33.807');
INSERT INTO public.roles VALUES ('cmkfh7nv10009fgxxur4snodc', 'Senior Engineer - BE', NULL, '2026-01-15 13:19:20.462', '2026-01-15 13:19:20.462');
INSERT INTO public.roles VALUES ('cmkfglbkx0002fgxx694lipv2', 'Lead BE Engineer', NULL, '2026-01-15 13:01:58.114', '2026-01-15 13:22:16.721');
INSERT INTO public.roles VALUES ('cmkfgl5yr0001fgxxcj1avb14', 'Lead FE Engineer', NULL, '2026-01-15 13:01:50.836', '2026-01-15 13:23:11.385');


--
-- Data for Name: rate_cards; Type: TABLE DATA; Schema: public; Owner: francesco
--



--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: francesco
--



--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: francesco
--

INSERT INTO public.team_members VALUES ('cmke6cjvy0004swr194g9xz4z', 'Sadia', 'Fatima', 'sadia.fatima@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmke6b6fq0002swr1t93q9wqf', 1308.00, 'GBP', '2026-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-14 15:27:26.639', '2026-01-15 13:24:02.38');
INSERT INTO public.team_members VALUES ('cmkfhxkn0000cfgxxhyb93owe', 'Richard', 'Plumb', 'richard.plumb@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'fe44d809-0840-49d3-ab8c-97d1f56da370', 950.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:39:29.34', '2026-01-15 13:39:29.34');
INSERT INTO public.team_members VALUES ('cmkfhxkn4000efgxxnh4uh0s5', 'Nikolcho', 'Tutundijski', 'nikolcho.tutundijski@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfgl5yr0001fgxxcj1avb14', 1308.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:39:29.344', '2026-01-15 13:39:29.344');
INSERT INTO public.team_members VALUES ('cmkfhxknb000gfgxx3uny0tfy', 'Alexander', 'Onufriev', 'alexander.onufriev@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfglbkx0002fgxx694lipv2', 1308.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:39:29.351', '2026-01-15 13:39:29.351');
INSERT INTO public.team_members VALUES ('cmkfi0yhu000jfgxxyq57oi5a', 'Sarmistha', 'Biswas', 'sarmistha.biswas@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfgi8z20000fgxxutr6lz0r', 810.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.266', '2026-01-15 13:42:07.266');
INSERT INTO public.team_members VALUES ('cmkfi0yhw000lfgxxjbjlhkfy', 'Bhavesh', 'Kadam', 'bhavesh.kadam@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfgmexz0003fgxxrdbo2e74', 810.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.269', '2026-01-15 13:42:07.269');
INSERT INTO public.team_members VALUES ('cmkfi0yhx000nfgxxcki90zmu', 'Hardik', 'Naik', 'hardik.naik@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfgmws30004fgxxjkbag8ee', 810.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.269', '2026-01-15 13:42:07.269');
INSERT INTO public.team_members VALUES ('cmkfi0yhy000pfgxxl8jhumyb', 'Osheen', 'Jain', 'osheen.jain@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfgmexz0003fgxxrdbo2e74', 810.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.27', '2026-01-15 13:42:07.27');
INSERT INTO public.team_members VALUES ('cmkfi0yhz000rfgxx9ei5i8ll', 'Dragan', 'Trajkovski', 'dragan.trajkovski@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfgq83h0006fgxxns56372i', 810.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.272', '2026-01-15 13:42:07.272');
INSERT INTO public.team_members VALUES ('cmkfi0yi1000tfgxxhrlpea4l', 'Anja', 'Crnec', 'anja.crnec@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfgqzzr0007fgxxglkag4tl', 810.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.273', '2026-01-15 13:42:07.273');
INSERT INTO public.team_members VALUES ('cmkfi0yi2000vfgxxhyxyahpy', 'Ravi', 'Yadav', 'ravi.yadav@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfgqzzr0007fgxxglkag4tl', 810.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.275', '2026-01-15 13:42:07.275');
INSERT INTO public.team_members VALUES ('cmkfi0yi3000xfgxxf93mdz6t', 'Mohan', 'Mange', 'mohan.mange@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfgtswe0008fgxxolprbizv', 810.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.275', '2026-01-15 13:42:07.275');
INSERT INTO public.team_members VALUES ('cmkfi0yi4000zfgxxe5m2md1v', 'Dmytro', 'Korchevskyi', 'dmytro.korchevskyi@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfgtswe0008fgxxolprbizv', 810.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.276', '2026-01-15 13:42:07.276');
INSERT INTO public.team_members VALUES ('cmkfi0yi50011fgxxhrrcolb8', 'Pranav', 'Sakpal', 'pranav.sakpal@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfh7nv10009fgxxur4snodc', 810.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.277', '2026-01-15 13:42:07.277');
INSERT INTO public.team_members VALUES ('cmkfi0yiq0013fgxxx0lclq89', 'Andrii', 'Kulyk', 'andrii.kulyk@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', 'cmkfh7nv10009fgxxur4snodc', 810.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.299', '2026-01-15 13:42:07.299');
INSERT INTO public.team_members VALUES ('cmkfi0yir0015fgxxu41oekl2', 'Daksh', 'Agrawal', 'daksh.agrawal@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', '2f6bb176-d38f-4573-988f-bfe3169cfc4a', 340.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.3', '2026-01-15 13:42:07.3');
INSERT INTO public.team_members VALUES ('cmkfi0yis0017fgxx1p8h9urj', 'Gauri', 'Bhange', 'gauri.bhange@deltatre.com', 'cmke67l8a0000swr19gl9wlfq', '2f6bb176-d38f-4573-988f-bfe3169cfc4a', 340.00, 'GBP', '2025-01-01 00:00:00', NULL, 'active', 100.00, '2026-01-15 13:42:07.301', '2026-01-15 13:42:07.301');


--
-- Data for Name: team_member_tags; Type: TABLE DATA; Schema: public; Owner: francesco
--



--
-- Data for Name: timesheet_entries; Type: TABLE DATA; Schema: public; Owner: francesco
--

INSERT INTO public.timesheet_entries VALUES ('cmkejxovc0002eijcim2rzh6g', 'cmke6cjvy0004swr194g9xz4z', '2026-01-01', 5.45, NULL, '2026-01-14 21:47:47.881', '2026-01-14 21:47:47.881');
INSERT INTO public.timesheet_entries VALUES ('cmkejxovy0004eijcy1yloamb', 'cmke6cjvy0004swr194g9xz4z', '2026-01-02', 5.45, NULL, '2026-01-14 21:47:47.903', '2026-01-14 21:47:47.903');
INSERT INTO public.timesheet_entries VALUES ('cmkejxow00006eijcslohoe9b', 'cmke6cjvy0004swr194g9xz4z', '2026-01-05', 5.45, NULL, '2026-01-14 21:47:47.904', '2026-01-14 21:47:47.904');
INSERT INTO public.timesheet_entries VALUES ('cmkejxow20008eijc8uk0eri7', 'cmke6cjvy0004swr194g9xz4z', '2026-01-06', 5.45, NULL, '2026-01-14 21:47:47.907', '2026-01-14 21:47:47.907');
INSERT INTO public.timesheet_entries VALUES ('cmkejxow4000aeijc83ndjzwe', 'cmke6cjvy0004swr194g9xz4z', '2026-01-07', 5.45, NULL, '2026-01-14 21:47:47.908', '2026-01-14 21:47:47.908');
INSERT INTO public.timesheet_entries VALUES ('cmkejxow6000ceijc55wejw6k', 'cmke6cjvy0004swr194g9xz4z', '2026-01-08', 5.45, NULL, '2026-01-14 21:47:47.91', '2026-01-14 21:47:47.91');
INSERT INTO public.timesheet_entries VALUES ('cmkejxow7000eeijc5j1j75rt', 'cmke6cjvy0004swr194g9xz4z', '2026-01-09', 5.45, NULL, '2026-01-14 21:47:47.911', '2026-01-14 21:47:47.911');
INSERT INTO public.timesheet_entries VALUES ('cmkejxow8000geijc62xcb2ed', 'cmke6cjvy0004swr194g9xz4z', '2026-01-12', 5.45, NULL, '2026-01-14 21:47:47.913', '2026-01-14 21:47:47.913');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowa000ieijcyi2dt4uk', 'cmke6cjvy0004swr194g9xz4z', '2026-01-13', 5.45, NULL, '2026-01-14 21:47:47.914', '2026-01-14 21:47:47.914');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowb000keijcl7zp7k5v', 'cmke6cjvy0004swr194g9xz4z', '2026-01-14', 5.45, NULL, '2026-01-14 21:47:47.915', '2026-01-14 21:47:47.915');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowc000meijcgljr8zjm', 'cmke6cjvy0004swr194g9xz4z', '2026-01-15', 5.45, NULL, '2026-01-14 21:47:47.916', '2026-01-14 21:47:47.916');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowd000oeijc5967gyz1', 'cmke6cjvy0004swr194g9xz4z', '2026-01-16', 5.45, NULL, '2026-01-14 21:47:47.917', '2026-01-14 21:47:47.917');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowe000qeijciti4i1ua', 'cmke6cjvy0004swr194g9xz4z', '2026-01-19', 5.45, NULL, '2026-01-14 21:47:47.919', '2026-01-14 21:47:47.919');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowf000seijcqionv29m', 'cmke6cjvy0004swr194g9xz4z', '2026-01-20', 5.45, NULL, '2026-01-14 21:47:47.92', '2026-01-14 21:47:47.92');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowi000ueijcba1bjeo8', 'cmke6cjvy0004swr194g9xz4z', '2026-01-21', 5.45, NULL, '2026-01-14 21:47:47.922', '2026-01-14 21:47:47.922');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowj000weijclev2es47', 'cmke6cjvy0004swr194g9xz4z', '2026-01-22', 5.45, NULL, '2026-01-14 21:47:47.924', '2026-01-14 21:47:47.924');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowk000yeijc1ayaj4am', 'cmke6cjvy0004swr194g9xz4z', '2026-01-23', 5.45, NULL, '2026-01-14 21:47:47.924', '2026-01-14 21:47:47.924');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowl0010eijc3trg11hg', 'cmke6cjvy0004swr194g9xz4z', '2026-01-26', 5.45, NULL, '2026-01-14 21:47:47.925', '2026-01-14 21:47:47.925');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowr0012eijclgxm325w', 'cmke6cjvy0004swr194g9xz4z', '2026-01-27', 5.45, NULL, '2026-01-14 21:47:47.932', '2026-01-14 21:47:47.932');
INSERT INTO public.timesheet_entries VALUES ('cmkejxows0014eijcb1nclwzg', 'cmke6cjvy0004swr194g9xz4z', '2026-01-28', 5.45, NULL, '2026-01-14 21:47:47.933', '2026-01-14 21:47:47.933');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowt0016eijcenfxwc5e', 'cmke6cjvy0004swr194g9xz4z', '2026-01-29', 5.45, NULL, '2026-01-14 21:47:47.934', '2026-01-14 21:47:47.934');
INSERT INTO public.timesheet_entries VALUES ('cmkejxowu0018eijcgd74xuwm', 'cmke6cjvy0004swr194g9xz4z', '2026-01-30', 5.45, NULL, '2026-01-14 21:47:47.934', '2026-01-14 21:47:47.934');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1uy001afgxxytgx9m40', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.282', '2026-01-15 15:20:10.282');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1v8001cfgxx692fedem', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.292', '2026-01-15 15:20:10.292');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1v9001efgxxcrn291xy', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.293', '2026-01-15 15:20:10.293');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1va001gfgxxobh147kj', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.295', '2026-01-15 15:20:10.295');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vb001ifgxx69lxb68w', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.296', '2026-01-15 15:20:10.296');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vd001kfgxxu1m67gqg', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.297', '2026-01-15 15:20:10.297');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vf001mfgxxrbeu2567', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.3', '2026-01-15 15:20:10.3');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vg001ofgxxfoo3r53e', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.301', '2026-01-15 15:20:10.301');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vh001qfgxxwf4x4k0p', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.302', '2026-01-15 15:20:10.302');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vj001sfgxx09bkadkt', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.303', '2026-01-15 15:20:10.303');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vo001ufgxxwhj3tcoe', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.308', '2026-01-15 15:20:10.308');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vq001wfgxx3u6rg1aa', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.31', '2026-01-15 15:20:10.31');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vr001yfgxxh0l1d0x5', 'cmkfhxkn0000cfgxxhyb93owe', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.311', '2026-01-15 15:20:10.311');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vs0020fgxxgxamiekw', 'cmke6cjvy0004swr194g9xz4z', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.312', '2026-01-15 15:20:10.312');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vu0022fgxxnb6rr0nj', 'cmke6cjvy0004swr194g9xz4z', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.314', '2026-01-15 15:20:10.314');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vv0024fgxx8o74sfr8', 'cmke6cjvy0004swr194g9xz4z', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.316', '2026-01-15 15:20:10.316');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vx0026fgxxnodqyu7c', 'cmke6cjvy0004swr194g9xz4z', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.317', '2026-01-15 15:20:10.317');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1vz0028fgxxyzymwx1i', 'cmke6cjvy0004swr194g9xz4z', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.32', '2026-01-15 15:20:10.32');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1w1002afgxxta9rnm3e', 'cmke6cjvy0004swr194g9xz4z', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.321', '2026-01-15 15:20:10.321');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1w4002cfgxxflcicjzq', 'cmke6cjvy0004swr194g9xz4z', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.325', '2026-01-15 15:20:10.325');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1w6002efgxxsv34h43n', 'cmke6cjvy0004swr194g9xz4z', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.326', '2026-01-15 15:20:10.326');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1w7002gfgxxa3463duj', 'cmke6cjvy0004swr194g9xz4z', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.327', '2026-01-15 15:20:10.327');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1w8002ifgxxwzwlf5ll', 'cmke6cjvy0004swr194g9xz4z', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.329', '2026-01-15 15:20:10.329');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wa002kfgxx6fubs73i', 'cmke6cjvy0004swr194g9xz4z', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.33', '2026-01-15 15:20:10.33');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wb002mfgxxvwtttews', 'cmke6cjvy0004swr194g9xz4z', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.331', '2026-01-15 15:20:10.331');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wc002ofgxxytl3ykro', 'cmke6cjvy0004swr194g9xz4z', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.332', '2026-01-15 15:20:10.332');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wd002qfgxxr90clr2x', 'cmke6cjvy0004swr194g9xz4z', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.333', '2026-01-15 15:20:10.333');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1we002sfgxx8mscz91g', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.335', '2026-01-15 15:20:10.335');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wf002ufgxxwjh3dcz5', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.336', '2026-01-15 15:20:10.336');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wg002wfgxxaq0v869j', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.337', '2026-01-15 15:20:10.337');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wi002yfgxx2fdpudmz', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.338', '2026-01-15 15:20:10.338');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wj0030fgxxfudouinh', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.34', '2026-01-15 15:20:10.34');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wl0032fgxxel9qqhih', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.341', '2026-01-15 15:20:10.341');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wl0034fgxx89tigz4x', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.342', '2026-01-15 15:20:10.342');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wm0036fgxxl9sbvojb', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.343', '2026-01-15 15:20:10.343');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wn0038fgxxbv6663q0', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.343', '2026-01-15 15:20:10.343');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wo003afgxx7txhirx0', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.345', '2026-01-15 15:20:10.345');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wp003cfgxxs1hitygt', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.345', '2026-01-15 15:20:10.345');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wq003efgxxx4x9usk6', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.346', '2026-01-15 15:20:10.346');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wq003gfgxx1x0za7ih', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.347', '2026-01-15 15:20:10.347');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wr003ifgxxqdhkd4xi', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.348', '2026-01-15 15:20:10.348');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wt003kfgxxxadzmge9', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.349', '2026-01-15 15:20:10.349');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wu003mfgxxmhqqx8ph', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-22', 8.00, NULL, '2026-01-15 15:20:10.35', '2026-01-15 15:20:10.35');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wv003ofgxx8cnknebx', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-23', 8.00, NULL, '2026-01-15 15:20:10.351', '2026-01-15 15:20:10.351');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1ww003qfgxxnxygrii3', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-24', 8.00, NULL, '2026-01-15 15:20:10.353', '2026-01-15 15:20:10.353');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wy003sfgxxhs8larm7', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-25', 8.00, NULL, '2026-01-15 15:20:10.354', '2026-01-15 15:20:10.354');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1wy003ufgxxcbmh7e8u', 'cmkfhxkn4000efgxxnh4uh0s5', '2025-12-26', 7.00, NULL, '2026-01-15 15:20:10.355', '2026-01-15 15:20:10.355');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1x1003wfgxx6qpkgr66', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.357', '2026-01-15 15:20:10.357');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1x6003yfgxx8691xiyb', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.363', '2026-01-15 15:20:10.363');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1x90040fgxxy8gstrxo', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.366', '2026-01-15 15:20:10.366');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xg0042fgxxvah24dqp', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.373', '2026-01-15 15:20:10.373');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xi0044fgxxf4h7f56w', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.374', '2026-01-15 15:20:10.374');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xj0046fgxx9kmfr8gj', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.375', '2026-01-15 15:20:10.375');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xn0048fgxxqj09cioo', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.379', '2026-01-15 15:20:10.379');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xp004afgxxggw4ozpo', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.381', '2026-01-15 15:20:10.381');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xq004cfgxxcmfxwzpc', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.382', '2026-01-15 15:20:10.382');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xs004efgxxrxv0efnx', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.385', '2026-01-15 15:20:10.385');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xu004gfgxxys74gyjx', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.386', '2026-01-15 15:20:10.386');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xv004ifgxxc2magnef', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.387', '2026-01-15 15:20:10.387');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xw004kfgxx16psifiv', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.389', '2026-01-15 15:20:10.389');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xy004mfgxx1u0j6cm1', 'cmkfhxknb000gfgxx3uny0tfy', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.39', '2026-01-15 15:20:10.39');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1xz004ofgxxecu1io7p', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.391', '2026-01-15 15:20:10.391');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1y0004qfgxxprhi84b2', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.393', '2026-01-15 15:20:10.393');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1y1004sfgxx6x2x45y9', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.394', '2026-01-15 15:20:10.394');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1y2004ufgxxy90zlx29', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.395', '2026-01-15 15:20:10.395');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1y3004wfgxxkn1dtcxu', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.396', '2026-01-15 15:20:10.396');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1y7004yfgxx4te4qj6n', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.4', '2026-01-15 15:20:10.4');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1y90050fgxx7egfcdvr', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.401', '2026-01-15 15:20:10.401');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1ya0052fgxx81a4ze03', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.402', '2026-01-15 15:20:10.402');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yb0054fgxxx9vyw3c6', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.403', '2026-01-15 15:20:10.403');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yd0056fgxxx2em48zh', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.405', '2026-01-15 15:20:10.405');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1ye0058fgxxp89xsqow', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.407', '2026-01-15 15:20:10.407');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yf005afgxx3cchldcx', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.407', '2026-01-15 15:20:10.407');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yg005cfgxx5c3298xk', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.409', '2026-01-15 15:20:10.409');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yi005efgxxzhrsnl7l', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.41', '2026-01-15 15:20:10.41');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yj005gfgxx8jymgddc', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.411', '2026-01-15 15:20:10.411');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yj005ifgxx6qhap46c', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-22', 8.00, NULL, '2026-01-15 15:20:10.412', '2026-01-15 15:20:10.412');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yl005kfgxx9whpkkns', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-23', 8.00, NULL, '2026-01-15 15:20:10.413', '2026-01-15 15:20:10.413');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1ym005mfgxxi58x1ioe', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-24', 8.00, NULL, '2026-01-15 15:20:10.414', '2026-01-15 15:20:10.414');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yn005ofgxxesbfqm53', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-25', 8.00, NULL, '2026-01-15 15:20:10.415', '2026-01-15 15:20:10.415');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yp005qfgxx3vz3noyv', 'cmkfi0yhw000lfgxxjbjlhkfy', '2025-12-26', 8.00, NULL, '2026-01-15 15:20:10.417', '2026-01-15 15:20:10.417');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yp005sfgxxj92o899n', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.418', '2026-01-15 15:20:10.418');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yq005ufgxxl8d85i25', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.419', '2026-01-15 15:20:10.419');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yr005wfgxx23q9k7nt', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.419', '2026-01-15 15:20:10.419');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yr005yfgxxp5a1p69z', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.42', '2026-01-15 15:20:10.42');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yt0060fgxxuvwajpix', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.421', '2026-01-15 15:20:10.421');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yu0062fgxxjbg62lru', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.423', '2026-01-15 15:20:10.423');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yv0064fgxxhcn0fygc', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.424', '2026-01-15 15:20:10.424');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yw0066fgxxbr2u1vt6', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.425', '2026-01-15 15:20:10.425');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yx0068fgxx32oosbfv', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.425', '2026-01-15 15:20:10.425');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yy006afgxx76oazedw', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.426', '2026-01-15 15:20:10.426');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1yz006cfgxxpuhbvo8q', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.427', '2026-01-15 15:20:10.427');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1z0006efgxxppe6w3dk', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.428', '2026-01-15 15:20:10.428');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1z0006gfgxxcogm44rf', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.429', '2026-01-15 15:20:10.429');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1z2006ifgxxi55ubvxv', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.431', '2026-01-15 15:20:10.431');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1z4006kfgxxnqui6iyp', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.432', '2026-01-15 15:20:10.432');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1z6006mfgxxffl2qimk', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-22', 8.00, NULL, '2026-01-15 15:20:10.434', '2026-01-15 15:20:10.434');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1z7006ofgxx72h57woy', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-23', 8.00, NULL, '2026-01-15 15:20:10.435', '2026-01-15 15:20:10.435');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1z8006qfgxxda9dqr8x', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-24', 8.00, NULL, '2026-01-15 15:20:10.436', '2026-01-15 15:20:10.436');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1z9006sfgxxui2l4w5s', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-25', 8.00, NULL, '2026-01-15 15:20:10.437', '2026-01-15 15:20:10.437');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zb006ufgxxrdg5ktfn', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-26', 8.00, NULL, '2026-01-15 15:20:10.439', '2026-01-15 15:20:10.439');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zc006wfgxx5t42lxnp', 'cmkfi0yhx000nfgxxcki90zmu', '2025-12-29', 8.00, NULL, '2026-01-15 15:20:10.44', '2026-01-15 15:20:10.44');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zd006yfgxxfacpdd1z', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.441', '2026-01-15 15:20:10.441');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1ze0070fgxxft9sf8ky', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.442', '2026-01-15 15:20:10.442');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zf0072fgxxrfb15n76', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.443', '2026-01-15 15:20:10.443');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zg0074fgxx54zddspn', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.444', '2026-01-15 15:20:10.444');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zh0076fgxx6eb9u8pe', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.446', '2026-01-15 15:20:10.446');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zj0078fgxx4jzdyt7b', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.447', '2026-01-15 15:20:10.447');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zk007afgxxwwgwxttr', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.448', '2026-01-15 15:20:10.448');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zl007cfgxxeof6koxi', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.449', '2026-01-15 15:20:10.449');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zm007efgxxqagvzl9s', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.451', '2026-01-15 15:20:10.451');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zn007gfgxxak0vqd6j', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.451', '2026-01-15 15:20:10.451');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zo007ifgxxart4gp8h', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.452', '2026-01-15 15:20:10.452');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zp007kfgxxc90azxb2', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.453', '2026-01-15 15:20:10.453');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zq007mfgxxvwjamdxi', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.454', '2026-01-15 15:20:10.454');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zr007ofgxxas1q9pc1', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.456', '2026-01-15 15:20:10.456');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zs007qfgxxe98twv92', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.457', '2026-01-15 15:20:10.457');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zu007sfgxxioudz8y0', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-22', 8.00, NULL, '2026-01-15 15:20:10.458', '2026-01-15 15:20:10.458');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zv007ufgxxdlkj89xm', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-23', 8.00, NULL, '2026-01-15 15:20:10.459', '2026-01-15 15:20:10.459');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zv007wfgxx304w88it', 'cmkfi0yhy000pfgxxl8jhumyb', '2025-12-24', 4.00, NULL, '2026-01-15 15:20:10.46', '2026-01-15 15:20:10.46');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zw007yfgxxfiscanik', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.461', '2026-01-15 15:20:10.461');
INSERT INTO public.timesheet_entries VALUES ('cmkflj1zy0080fgxx80ngdtw3', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.463', '2026-01-15 15:20:10.463');
INSERT INTO public.timesheet_entries VALUES ('cmkflj2010082fgxxxv5qw46e', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.466', '2026-01-15 15:20:10.466');
INSERT INTO public.timesheet_entries VALUES ('cmkflj2030084fgxxupjuerdg', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.467', '2026-01-15 15:20:10.467');
INSERT INTO public.timesheet_entries VALUES ('cmkflj2040086fgxxf928l1bu', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.468', '2026-01-15 15:20:10.468');
INSERT INTO public.timesheet_entries VALUES ('cmkflj2050088fgxxusndsbko', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.469', '2026-01-15 15:20:10.469');
INSERT INTO public.timesheet_entries VALUES ('cmkflj206008afgxxef7jkybm', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.47', '2026-01-15 15:20:10.47');
INSERT INTO public.timesheet_entries VALUES ('cmkflj207008cfgxxx3qa2s72', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.471', '2026-01-15 15:20:10.471');
INSERT INTO public.timesheet_entries VALUES ('cmkflj209008efgxxbn6q93op', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.473', '2026-01-15 15:20:10.473');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20b008gfgxxttze58mb', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.475', '2026-01-15 15:20:10.475');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20c008ifgxxpxxlb2ng', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.476', '2026-01-15 15:20:10.476');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20d008kfgxxp47rby6g', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.477', '2026-01-15 15:20:10.477');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20f008mfgxxe7t9cq6c', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.479', '2026-01-15 15:20:10.479');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20g008ofgxxlc6vvlim', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.481', '2026-01-15 15:20:10.481');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20h008qfgxxz7fkbejm', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.482', '2026-01-15 15:20:10.482');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20i008sfgxxejerilts', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-22', 8.00, NULL, '2026-01-15 15:20:10.483', '2026-01-15 15:20:10.483');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20j008ufgxxx66k0a8g', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-23', 8.00, NULL, '2026-01-15 15:20:10.484', '2026-01-15 15:20:10.484');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20l008wfgxxqht7ml4b', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-24', 8.00, NULL, '2026-01-15 15:20:10.485', '2026-01-15 15:20:10.485');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20m008yfgxx7y6mo76t', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-25', 8.00, NULL, '2026-01-15 15:20:10.486', '2026-01-15 15:20:10.486');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20n0090fgxx3r36ox40', 'cmkfi0yhz000rfgxx9ei5i8ll', '2025-12-26', 7.00, NULL, '2026-01-15 15:20:10.488', '2026-01-15 15:20:10.488');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20p0092fgxx6iw5wyp3', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.49', '2026-01-15 15:20:10.49');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20q0094fgxxu3o77glf', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.491', '2026-01-15 15:20:10.491');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20r0096fgxxd8ru5n7n', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.492', '2026-01-15 15:20:10.492');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20s0098fgxxyi59l3pt', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.493', '2026-01-15 15:20:10.493');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20t009afgxxz9c8xqp5', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.494', '2026-01-15 15:20:10.494');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20u009cfgxxcxwd9qob', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.495', '2026-01-15 15:20:10.495');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20v009efgxxxj6z65a3', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.496', '2026-01-15 15:20:10.496');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20x009gfgxx4ey8tbp8', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.497', '2026-01-15 15:20:10.497');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20y009ifgxxcs03fq8c', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.499', '2026-01-15 15:20:10.499');
INSERT INTO public.timesheet_entries VALUES ('cmkflj20z009kfgxxaz16rl7w', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.5', '2026-01-15 15:20:10.5');
INSERT INTO public.timesheet_entries VALUES ('cmkflj211009mfgxxoalm7kvb', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.501', '2026-01-15 15:20:10.501');
INSERT INTO public.timesheet_entries VALUES ('cmkflj212009ofgxxp9hgv8cf', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.502', '2026-01-15 15:20:10.502');
INSERT INTO public.timesheet_entries VALUES ('cmkflj213009qfgxx0a7pei29', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.503', '2026-01-15 15:20:10.503');
INSERT INTO public.timesheet_entries VALUES ('cmkflj216009sfgxx46syzlde', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.507', '2026-01-15 15:20:10.507');
INSERT INTO public.timesheet_entries VALUES ('cmkflj218009ufgxxhd8ndxme', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.508', '2026-01-15 15:20:10.508');
INSERT INTO public.timesheet_entries VALUES ('cmkflj219009wfgxx3q5szxgq', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-22', 8.00, NULL, '2026-01-15 15:20:10.509', '2026-01-15 15:20:10.509');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21a009yfgxx033wc01j', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-23', 8.00, NULL, '2026-01-15 15:20:10.51', '2026-01-15 15:20:10.51');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21b00a0fgxxnaav5fyy', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-24', 8.00, NULL, '2026-01-15 15:20:10.511', '2026-01-15 15:20:10.511');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21c00a2fgxxs71vbnvz', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-25', 8.00, NULL, '2026-01-15 15:20:10.513', '2026-01-15 15:20:10.513');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21d00a4fgxxh13b9bex', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-26', 8.00, NULL, '2026-01-15 15:20:10.514', '2026-01-15 15:20:10.514');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21e00a6fgxxi7tnq9q8', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-29', 8.00, NULL, '2026-01-15 15:20:10.515', '2026-01-15 15:20:10.515');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21f00a8fgxxcqub0dc0', 'cmkfi0yi1000tfgxxhrlpea4l', '2025-12-30', 7.00, NULL, '2026-01-15 15:20:10.516', '2026-01-15 15:20:10.516');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21h00aafgxxi0p1hczz', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.517', '2026-01-15 15:20:10.517');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21i00acfgxxabhte1r7', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.518', '2026-01-15 15:20:10.518');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21k00aefgxxat2dajgt', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.521', '2026-01-15 15:20:10.521');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21l00agfgxx1g057u6c', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.522', '2026-01-15 15:20:10.522');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21o00aifgxxt0bbamw6', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.525', '2026-01-15 15:20:10.525');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21p00akfgxxcp5x4h0n', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.525', '2026-01-15 15:20:10.525');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21q00amfgxxhpixs1o1', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.526', '2026-01-15 15:20:10.526');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21r00aofgxx45y9mr4z', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.527', '2026-01-15 15:20:10.527');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21v00aqfgxxzjb7563t', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.531', '2026-01-15 15:20:10.531');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21w00asfgxxid6l7zku', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.532', '2026-01-15 15:20:10.532');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21x00aufgxx8c7z1zc3', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.534', '2026-01-15 15:20:10.534');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21y00awfgxxidyonydh', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.535', '2026-01-15 15:20:10.535');
INSERT INTO public.timesheet_entries VALUES ('cmkflj21z00ayfgxxh8gdkbbf', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.536', '2026-01-15 15:20:10.536');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22000b0fgxx5uvegqxs', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.537', '2026-01-15 15:20:10.537');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22500b2fgxxufr7ema3', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.541', '2026-01-15 15:20:10.541');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22600b4fgxxkqhzwd2f', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-22', 8.00, NULL, '2026-01-15 15:20:10.543', '2026-01-15 15:20:10.543');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22900b6fgxx9mwyio1g', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-23', 8.00, NULL, '2026-01-15 15:20:10.546', '2026-01-15 15:20:10.546');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22b00b8fgxxgfw2mqcd', 'cmkfi0yi2000vfgxxhyxyahpy', '2025-12-24', 8.00, NULL, '2026-01-15 15:20:10.547', '2026-01-15 15:20:10.547');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22b00bafgxxgsgx1mxp', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.548', '2026-01-15 15:20:10.548');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22c00bcfgxxa3mbb4iz', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.549', '2026-01-15 15:20:10.549');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22d00befgxxz7l0flj1', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.55', '2026-01-15 15:20:10.55');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22e00bgfgxxy0frj70k', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.551', '2026-01-15 15:20:10.551');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22f00bifgxx5mhf9cvr', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.552', '2026-01-15 15:20:10.552');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22g00bkfgxxsq758p1i', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.552', '2026-01-15 15:20:10.552');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22h00bmfgxx39m7p0sx', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.553', '2026-01-15 15:20:10.553');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22h00bofgxx2u42goa2', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.554', '2026-01-15 15:20:10.554');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22j00bqfgxxzc7qjenz', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.555', '2026-01-15 15:20:10.555');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22k00bsfgxxyytzt8h3', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.556', '2026-01-15 15:20:10.556');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22l00bufgxx4b2w4p8c', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.557', '2026-01-15 15:20:10.557');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22m00bwfgxx9uc8rdhq', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.558', '2026-01-15 15:20:10.558');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22n00byfgxxgv8rzrjk', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.559', '2026-01-15 15:20:10.559');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22r00c0fgxxsgi4o542', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.564', '2026-01-15 15:20:10.564');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22s00c2fgxxxm0qt9ah', 'cmkfi0yi3000xfgxxf93mdz6t', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.565', '2026-01-15 15:20:10.565');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22t00c4fgxxpirtic1x', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.566', '2026-01-15 15:20:10.566');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22v00c6fgxxsaf4gayz', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.567', '2026-01-15 15:20:10.567');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22w00c8fgxx02hinvry', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.569', '2026-01-15 15:20:10.569');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22x00cafgxxi6owat82', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.57', '2026-01-15 15:20:10.57');
INSERT INTO public.timesheet_entries VALUES ('cmkflj22y00ccfgxxhsdtmgpu', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.571', '2026-01-15 15:20:10.571');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23200cefgxxf6xzoa6b', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.575', '2026-01-15 15:20:10.575');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23400cgfgxxeodu3ap2', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.576', '2026-01-15 15:20:10.576');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23500cifgxxgus3c07k', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.577', '2026-01-15 15:20:10.577');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23900ckfgxxuq334pli', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.581', '2026-01-15 15:20:10.581');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23a00cmfgxx9vmoy4y2', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.583', '2026-01-15 15:20:10.583');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23b00cofgxxwvmjegcp', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.584', '2026-01-15 15:20:10.584');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23c00cqfgxxtgu05shg', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.585', '2026-01-15 15:20:10.585');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23e00csfgxx90wod8n6', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.586', '2026-01-15 15:20:10.586');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23f00cufgxx0n3wawsb', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.587', '2026-01-15 15:20:10.587');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23k00cwfgxxqpdfdlq6', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.592', '2026-01-15 15:20:10.592');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23k00cyfgxx1lh3lm5r', 'cmkfi0yi4000zfgxxe5m2md1v', '2025-12-22', 5.00, NULL, '2026-01-15 15:20:10.593', '2026-01-15 15:20:10.593');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23l00d0fgxx5z9b2zqe', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.594', '2026-01-15 15:20:10.594');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23n00d2fgxxsncednw7', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.596', '2026-01-15 15:20:10.596');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23p00d4fgxxxrpmrfso', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.597', '2026-01-15 15:20:10.597');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23q00d6fgxxh1tmx4i7', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.598', '2026-01-15 15:20:10.598');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23r00d8fgxxjons731f', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.6', '2026-01-15 15:20:10.6');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23u00dafgxxm0c1zino', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.602', '2026-01-15 15:20:10.602');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23v00dcfgxxo2i8ixuy', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.604', '2026-01-15 15:20:10.604');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23y00defgxx3xw3dpwj', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.606', '2026-01-15 15:20:10.606');
INSERT INTO public.timesheet_entries VALUES ('cmkflj23z00dgfgxx8sgphqm5', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.608', '2026-01-15 15:20:10.608');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24100difgxxpyxmz31b', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.609', '2026-01-15 15:20:10.609');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24200dkfgxxmifazys7', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.611', '2026-01-15 15:20:10.611');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24300dmfgxxwbmgyqf4', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.612', '2026-01-15 15:20:10.612');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24400dofgxx4n0kk7v6', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.613', '2026-01-15 15:20:10.613');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24500dqfgxxpizviqao', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.614', '2026-01-15 15:20:10.614');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24700dsfgxxifd1l079', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.615', '2026-01-15 15:20:10.615');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24800dufgxxv951h7k1', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-22', 8.00, NULL, '2026-01-15 15:20:10.616', '2026-01-15 15:20:10.616');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24900dwfgxxa5jfz8of', 'cmkfi0yi50011fgxxhrrcolb8', '2025-12-23', 8.00, NULL, '2026-01-15 15:20:10.617', '2026-01-15 15:20:10.617');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24a00dyfgxxo6rj71n7', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.619', '2026-01-15 15:20:10.619');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24b00e0fgxxvq9nryc9', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.62', '2026-01-15 15:20:10.62');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24c00e2fgxx1uaizboo', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.621', '2026-01-15 15:20:10.621');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24g00e4fgxx0pdjysd8', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.625', '2026-01-15 15:20:10.625');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24h00e6fgxx2zo5rn2z', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.626', '2026-01-15 15:20:10.626');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24i00e8fgxxaghbpmje', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.627', '2026-01-15 15:20:10.627');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24j00eafgxxnoppnaht', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.627', '2026-01-15 15:20:10.627');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24l00ecfgxxzlclqrnw', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.629', '2026-01-15 15:20:10.629');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24m00eefgxxvshq5h3g', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.631', '2026-01-15 15:20:10.631');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24n00egfgxx9zxfaqjn', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.632', '2026-01-15 15:20:10.632');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24r00eifgxx0h1hyodb', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.635', '2026-01-15 15:20:10.635');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24s00ekfgxxcxdt0spk', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.637', '2026-01-15 15:20:10.637');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24w00emfgxxzvvfzbpe', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.64', '2026-01-15 15:20:10.64');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24x00eofgxx67hp1qzr', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.641', '2026-01-15 15:20:10.641');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24y00eqfgxxao0ow1k7', 'cmkfi0yiq0013fgxxx0lclq89', '2025-12-19', 5.00, NULL, '2026-01-15 15:20:10.642', '2026-01-15 15:20:10.642');
INSERT INTO public.timesheet_entries VALUES ('cmkflj24z00esfgxxxenwcb30', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.643', '2026-01-15 15:20:10.643');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25000eufgxxzktuafrt', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.645', '2026-01-15 15:20:10.645');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25100ewfgxxsb62i219', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.646', '2026-01-15 15:20:10.646');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25200eyfgxxot07utk2', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.647', '2026-01-15 15:20:10.647');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25300f0fgxxsbvgyoiq', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.648', '2026-01-15 15:20:10.648');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25500f2fgxx0fs7hbu1', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.65', '2026-01-15 15:20:10.65');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25600f4fgxxqhrg6m57', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.651', '2026-01-15 15:20:10.651');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25700f6fgxxj6l8abkm', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.652', '2026-01-15 15:20:10.652');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25800f8fgxxj0ykp8jo', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.652', '2026-01-15 15:20:10.652');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25900fafgxx9vyv9df4', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.654', '2026-01-15 15:20:10.654');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25d00fcfgxxqkkx60xq', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.658', '2026-01-15 15:20:10.658');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25f00fefgxxael5yj0s', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.66', '2026-01-15 15:20:10.66');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25g00fgfgxxxvxc76s8', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.661', '2026-01-15 15:20:10.661');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25i00fifgxxg39kgesk', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.662', '2026-01-15 15:20:10.662');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25j00fkfgxx7fm2t9z2', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.663', '2026-01-15 15:20:10.663');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25k00fmfgxxnb4omc39', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-22', 8.00, NULL, '2026-01-15 15:20:10.665', '2026-01-15 15:20:10.665');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25l00fofgxxgk00r285', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-23', 8.00, NULL, '2026-01-15 15:20:10.666', '2026-01-15 15:20:10.666');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25m00fqfgxxiuwkbngp', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-24', 8.00, NULL, '2026-01-15 15:20:10.667', '2026-01-15 15:20:10.667');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25o00fsfgxxw8wg4zie', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-25', 8.00, NULL, '2026-01-15 15:20:10.668', '2026-01-15 15:20:10.668');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25p00fufgxx97c6wi1j', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-26', 8.00, NULL, '2026-01-15 15:20:10.669', '2026-01-15 15:20:10.669');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25q00fwfgxxdachoqnr', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-29', 8.00, NULL, '2026-01-15 15:20:10.671', '2026-01-15 15:20:10.671');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25u00fyfgxxequtizsc', 'cmkfi0yir0015fgxxu41oekl2', '2025-12-30', 4.00, NULL, '2026-01-15 15:20:10.674', '2026-01-15 15:20:10.674');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25v00g0fgxx85ac2b21', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-01', 8.00, NULL, '2026-01-15 15:20:10.675', '2026-01-15 15:20:10.675');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25w00g2fgxx80qyq3ko', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-02', 8.00, NULL, '2026-01-15 15:20:10.676', '2026-01-15 15:20:10.676');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25x00g4fgxxdfsmw078', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-03', 8.00, NULL, '2026-01-15 15:20:10.677', '2026-01-15 15:20:10.677');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25y00g6fgxxdmvyy5mh', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-04', 8.00, NULL, '2026-01-15 15:20:10.678', '2026-01-15 15:20:10.678');
INSERT INTO public.timesheet_entries VALUES ('cmkflj25z00g8fgxx8j6n476v', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-05', 8.00, NULL, '2026-01-15 15:20:10.679', '2026-01-15 15:20:10.679');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26000gafgxxwecaq846', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-08', 8.00, NULL, '2026-01-15 15:20:10.68', '2026-01-15 15:20:10.68');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26100gcfgxxkqogfwtg', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-09', 8.00, NULL, '2026-01-15 15:20:10.682', '2026-01-15 15:20:10.682');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26200gefgxxan53vgbq', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-10', 8.00, NULL, '2026-01-15 15:20:10.683', '2026-01-15 15:20:10.683');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26400ggfgxx3utftl92', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-11', 8.00, NULL, '2026-01-15 15:20:10.684', '2026-01-15 15:20:10.684');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26500gifgxxfu64ocs4', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-12', 8.00, NULL, '2026-01-15 15:20:10.685', '2026-01-15 15:20:10.685');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26500gkfgxxrx9a6uar', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-15', 8.00, NULL, '2026-01-15 15:20:10.686', '2026-01-15 15:20:10.686');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26600gmfgxxjcpzkx68', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-16', 8.00, NULL, '2026-01-15 15:20:10.687', '2026-01-15 15:20:10.687');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26700gofgxxq7r71pxf', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-17', 8.00, NULL, '2026-01-15 15:20:10.688', '2026-01-15 15:20:10.688');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26b00gqfgxx1acawjeo', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-18', 8.00, NULL, '2026-01-15 15:20:10.691', '2026-01-15 15:20:10.691');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26b00gsfgxxioag6mka', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-19', 8.00, NULL, '2026-01-15 15:20:10.692', '2026-01-15 15:20:10.692');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26c00gufgxxllj0091l', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-22', 8.00, NULL, '2026-01-15 15:20:10.693', '2026-01-15 15:20:10.693');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26e00gwfgxx8b6cunuo', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-23', 8.00, NULL, '2026-01-15 15:20:10.694', '2026-01-15 15:20:10.694');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26f00gyfgxx8ygfp25e', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-24', 8.00, NULL, '2026-01-15 15:20:10.695', '2026-01-15 15:20:10.695');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26g00h0fgxxr5z8nxqt', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-25', 8.00, NULL, '2026-01-15 15:20:10.697', '2026-01-15 15:20:10.697');
INSERT INTO public.timesheet_entries VALUES ('cmkflj26h00h2fgxx8agmampy', 'cmkfi0yis0017fgxx1p8h9urj', '2025-12-26', 8.00, NULL, '2026-01-15 15:20:10.698', '2026-01-15 15:20:10.698');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: francesco
--

INSERT INTO public.users VALUES ('cmke66mbj0000ys5hbgsw20in', 'admin@example.com', '$2b$12$Ci8YdElceaGe4srrtgN6A.fbXk13OIbKTUVQJ.qilPRLOGOCp4Y7a', 'Admin User', 'admin', true, '2026-01-14 15:22:49.856', '2026-01-14 15:22:49.856');
INSERT INTO public.users VALUES ('cmke66mbv0001ys5ht39m2y7p', 'viewer@example.com', '$2b$12$Ci8YdElceaGe4srrtgN6A.fbXk13OIbKTUVQJ.qilPRLOGOCp4Y7a', 'View User', 'view', true, '2026-01-14 15:22:49.868', '2026-01-14 15:22:49.868');
INSERT INTO public.users VALUES ('cmke66mbx0002ys5hcer7zbc1', 'writer@example.com', '$2b$12$Ci8YdElceaGe4srrtgN6A.fbXk13OIbKTUVQJ.qilPRLOGOCp4Y7a', 'Write User', 'write', true, '2026-01-14 15:22:49.869', '2026-01-14 15:22:49.869');
INSERT INTO public.users VALUES ('cmke66mby0003ys5hgmaepbdv', 'inactive@example.com', '$2b$12$Ci8YdElceaGe4srrtgN6A.fbXk13OIbKTUVQJ.qilPRLOGOCp4Y7a', 'Inactive User', 'view', false, '2026-01-14 15:22:49.871', '2026-01-14 15:22:49.871');
INSERT INTO public.users VALUES ('cmke66mbz0004ys5hkgdxi77t', 'denied@example.com', '$2b$12$Ci8YdElceaGe4srrtgN6A.fbXk13OIbKTUVQJ.qilPRLOGOCp4Y7a', 'Denied User', 'denied', true, '2026-01-14 15:22:49.872', '2026-01-14 15:22:49.872');


--
-- Data for Name: vendor_tags; Type: TABLE DATA; Schema: public; Owner: francesco
--



--
-- PostgreSQL database dump complete
--

\unrestrict LTiAueYVHNVG5fti2Tpdmvop4Ll9gJuzCdN4uHwmJ0xzClk23AzwIbjqUBDnAcK

