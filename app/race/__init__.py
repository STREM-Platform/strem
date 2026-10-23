"""Race OS intelligence (docs#26): race engine, enrichment, AI race team.

The engine always produces a complete, bounded plan for every layer of a Race
Mission. Claude personalizes and explains on top when it is available; every
stored layer records whether the engine or the AI produced it. Domain services
remain the sources of truth — this package reads and writes through their APIs
with the athlete's own token and copies no raw logs.
"""
