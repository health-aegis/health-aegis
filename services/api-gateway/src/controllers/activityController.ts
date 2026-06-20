import { Request, Response } from 'express';
import { ActivityModel } from '../models/models';

export const getActivities = async (req: Request, res: Response) => {
  try {
    const activities = await ActivityModel.find({ userId: req.userId });
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createActivity = async (req: Request, res: Response) => {
  try {
    const activity = new ActivityModel({ ...req.body, userId: req.userId });
    const saved = await activity.save();
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateActivity = async (req: Request, res: Response) => {
  try {
    const updated = await ActivityModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Activity not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteActivity = async (req: Request, res: Response) => {
  try {
    const deleted = await ActivityModel.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ error: 'Activity not found' });
    res.json({ message: 'Activity deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    // Cosmos DB requires indexed fields for .sort() — sort in JS instead
    const rawActivities = await ActivityModel.find({ userId: req.userId });
    const activities = rawActivities.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    // Total Calories
    const totalCalories = activities.reduce((acc, curr) => acc + (curr.caloriesBurned || 0), 0);

    // Total Minutes
    const totalMinutes = activities.reduce((acc, curr) => acc + (curr.duration || 0), 0);

    // Streak logic (consecutive days with at least one activity)
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const activityDates = Array.from(new Set(activities
      .filter(a => a.date && typeof a.date === 'string')
      .map(a => {
        const d = new Date(a.date);
        if (isNaN(d.getTime())) return null;
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
      .filter((t): t is number => t !== null)
    )).sort((a, b) => b - a);

    if (activityDates.length > 0) {
      let checkDate = currentDate.getTime();
      if (activityDates[0] === checkDate) {
        streak = 1;
        checkDate -= 86400000;
        for (let i = 1; i < activityDates.length; i++) {
          if (activityDates[i] === checkDate) {
            streak++;
            checkDate -= 86400000;
          } else {
            break;
          }
        }
      } else if (activityDates[0] === checkDate - 86400000) {
        streak = 1;
        checkDate -= 86400000;
        for (let i = 1; i < activityDates.length; i++) {
          if (activityDates[i] === checkDate - 86400000) {
            streak++;
            checkDate -= 86400000;
          } else {
            break;
          }
        }
      }
    }

    // Weekly summary (last 7 days)
    const weeklyData: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const dayActivities = activities.filter(a => a.date && typeof a.date === 'string' && a.date.startsWith(dateString));
      weeklyData.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        calories: dayActivities.reduce((acc, curr) => acc + (curr.caloriesBurned || 0), 0),
        duration: dayActivities.reduce((acc, curr) => acc + (curr.duration || 0), 0)
      });
    }

    // Breakdown by type
    const breakdown = activities.reduce((acc: any, curr) => {
      if (curr.type) acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalActivities: activities.length,
      totalCalories,
      totalMinutes,
      streak,
      weeklyData,
      breakdown
    });

  } catch (error: any) {
    console.error('Error in getStats:', error);
    res.status(500).json({ error: error.message });
  }
};

