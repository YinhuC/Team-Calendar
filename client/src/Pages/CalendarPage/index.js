/* Third Party */
import React from 'react';
import {
  Row, Col, Button,
} from 'reactstrap';

import {Link} from 'react-router-dom';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import InfiniteCalendar from 'react-infinite-calendar';
import {Trash2} from 'react-feather';
import moment from 'moment';
import {connect} from 'react-redux';
import {setTimes, setDates, setTitle, resetEventModal, setID} from '../../redux/actions';


// must manually import the stylesheets for each plugin
import '@fullcalendar/core/main.css';
import '@fullcalendar/daygrid/main.css';
import '@fullcalendar/timegrid/main.css';
import 'react-infinite-calendar/styles.css';
import PropTypes from 'prop-types';


/* Components */
import {OuterContainer, LeftContainer, Heading,
  RightContainer, Group, Member, List, Item, Subheader,
  OuterCalendarContainer, Add, CalendarContainer,
  SmallCalendarContainer, Menu,
} from './style';
import EventModal from './EventModal';
import EditModal from './EditModal';
import MemberModal from './MemberModal';
import randomColour from '../../Util/random-colour';


/* Functions */

class CalendarPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      update: false,
      calendarWeekends: true,
      calendarEvents: [],
      eventModal: false,
      memberModal: false,
      editModal: false,
      title: '',
      members: [],
      userCalendars: [],
      activeCalendars: [],
      userId: '',
    };
  }

  calendarComponentRef = React.createRef();

  componentDidMount() {
    const {groupid} = this.props.match.params;
    this.refreshData();
    fetch('/api/calendars/'+groupid).then( (res) => res.json().then( (json) => {
      this.setState({activeCalendars: json.calendars});
    }));
    fetch('/api/user_details').then((res) => res.json().then((json) => {
      this.setState({userId: json.id});
    }));
  }
  refereshEvents() {
    const {groupid} = this.props.match.params;
    const view = this.calendarComponentRef.current.getApi().view;
    const start = moment(view.activeStart).subtract(5, 'weeks').toISOString();
    const end = moment(view.activeEnd).add(5, 'weeks').toISOString();
    console.log(start);
    console.log(end);
    fetch('/api/calendars/'+groupid+'/events?start='+start+'&end='+end).then( (res) => res.json().then( (json) => {
      const events = [];
      json.result.sort((a, b) => (a.googleId > b.googleId) ? 1 : -1).map((item, index) => {
        const userColour = randomColour(item.googleId);
        console.log(item.events);
        item.events.map((event) => {
          events.push({
            id: event.id,
            title: event.summary,
            start: event.startDate,
            end: event.endDate,
            editable: item.googleId === groupid,
            backgroundColor: userColour.fill,
            borderColor: userColour.fill,
            textColor: userColour.text,
          });
        });
      });
      this.setState({calendarEvents: events});
    }));
  }
  refreshData() {
    const {groupid} = this.props.match.params;
    fetch('/api/groups/'+groupid).then( (res) => res.json().then( (json) => {
      this.setState({title: json.name});
    }));
    fetch('/api/groups/'+groupid+'/members').then( (res) => res.json().then( (json) => {
      this.setState({members: json.memberMap});
    }));
    fetch('/api/calendars?group='+groupid).then( (res) => res.json().then( (json) => {
      this.setState({userCalendars: json.calendars});
    }));
    this.refereshEvents();
  }

  toggleEventModal = () =>{
    if (!this.state.eventModal) {
      this.props.resetEventModal();
    }
    this.setState({
      eventModal: !this.state.eventModal,
    });
  }

  toggleMemberModal = () =>{
    this.setState({
      memberModal: !this.state.memberModal,
    });
    this.refreshData();
  }

  toggleDate = (data) =>{
    const calendar = this.calendarComponentRef.current.getApi();
    calendar.gotoDate( moment(data).format('YYYY-MM-DD') );
  }

  selectCallback = (data) => {
    this.toggleEventModal();
    this.props.setDates(
        moment(data.start).format('YYYY-MM-DD'),
        moment(data.end).format('YYYY-MM-DD'),
    );
    this.props.setTimes(
        moment(data.start).format('HH:mm'),
        moment(data.end).format('HH:mm'),
    );
  };
  componentDidUpdate() {
    const {groupid} = this.props.match.params;
    fetch('/api/calendars/'+groupid, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({calendars: this.state.activeCalendars}),
    });
    if (this.state.update) {
      this.refereshEvents();
      this.setState({update: false});
    }
  }

  triggerUpdate = () => {
    return new Promise((resolve) => {
      this.setState({update: true});
      resolve();
    });
  }

  onItemClick = (event) =>{
    const calendarId = event.target.value;
    if (this.state.activeCalendars.includes(calendarId)) {
      this.setState((prev) => ({
        activeCalendars: prev.activeCalendars.filter((id)=> id !== calendarId),
      }));
    } else {
      this.setState((prev) => ({
        activeCalendars: [...prev.activeCalendars, calendarId],
      }));
    }
  }

  removeMember = (userid) => {
    const {groupid} = this.props.match.params;
    fetch('/api/groups/'+groupid+'/members/'+userid, {
      method: 'DELETE',
    }).then((res, err) => {
      console.log(err);
      console.log(res);
      this.refreshData();
      alert('Member removed successfully.');
    });
  }

  toggleEdit = () => {
    this.setState({
      editModal: !this.state.editModal,
    });
  }

  openEdit = (data) => {
    console.log(data.event);
    if (!data.event.durationEditable) {
      return;
    }
    this.props.setDates(
        moment(data.event.start).format('YYYY-MM-DD'),
        moment(data.event.end).format('YYYY-MM-DD'),
    );
    this.props.setTimes(
        moment(data.event.start).format('HH:mm'),
        moment(data.event.end).format('HH:mm'),
    );
    this.props.setTitle(
        data.event.title,
    );
    this.props.setID(
        data.event.id,
    );
    this.toggleEdit();
  }

  render() {
    const {groupid} = this.props.match.params;
    const calendarsItems = [];
    this.state.userCalendars.map((calendar) => {
      const isActive = this.state.activeCalendars.includes(calendar.id);
      calendarsItems.push(
          <Item tag='button' key={calendar.id} className={isActive?'active':''}
            onClick={this.onItemClick} value={calendar.id}>
            {calendar.name}
          </Item>,
      );
    });

    const membersItems = [];
    const groupColour = randomColour(groupid);
    membersItems.push(
        <Item style={{backgroundColor: groupColour.fill, color: groupColour.text}} key={'g'}>
          {this.state.title}
        </Item>,
    );
    for (let i = 0; i < this.state.members.length; i++) {
      const memberColour = randomColour(this.state.members[i].googleId);
      membersItems.push(
          <Item style={{backgroundColor: memberColour.fill, color: memberColour.text}}
            className='d-flex justify-content-between' key={'u' + i}>
            {this.state.members[i].firstName}
            {this.state.members[i].googleId === this.state.userId ? <></> :
            <Menu onClick={() => {
              this.removeMember(this.state.members[i].googleId);
            }}>
              <Trash2/>
            </Menu>
            }
          </Item>,
      );
    }


    // const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);

    return (
      <OuterContainer>
        <EventModal isOpen={this.state.eventModal} toggle={this.toggleEventModal} groupid={groupid}
          refresh={this.triggerUpdate}/>
        <MemberModal isOpen={this.state.memberModal} toggle={this.toggleMemberModal} groupid={groupid}/>
        <EditModal isOpen={this.state.editModal} toggle={this.toggleEdit} groupid={groupid} refresh={this.triggerUpdate}/>

        <LeftContainer>
          <Row>
            <Col className="d-flex justify-content-center align-items-start my-3">
              <Link to="/landing">
                <Button color="primary" onClick={this.toggleLogin}>
                  &lt; Back to Dashbaord
                </Button>
              </Link>
            </Col>
            <Col>
              <SmallCalendarContainer>
                <InfiniteCalendar
                  width={280}
                  height={280}
                  onSelect={this.toggleDate}
                />
              </SmallCalendarContainer>
            </Col>
            <Col className="col-12">
              <Subheader>Calendars</Subheader>
              <Group>
                <List>
                  {calendarsItems}
                </List>
              </Group>
            </Col>
            <Col className="col-12 mt-5 mb-1 d-flex flex-row justify-content-between align-items-center">
              <Subheader>Members</Subheader>
              <Button color="primary" onClick={this.toggleMemberModal}>Add Members</Button>
            </Col>
            <Col className="col-12">
              <Member>
                <List>
                  {membersItems}
                </List>
              </Member>
            </Col>
          </Row>
        </LeftContainer>
        <RightContainer>
          <OuterCalendarContainer>
            <Row>
              <Col className="col-12 d-flex space-between align-items-center">
                <Heading>
                  {this.state.title}
                </Heading>
                <Add color="primary" onClick={this.toggleEventModal}>
                  + Add Event
                </Add>
              </Col>
              <Col className="col-12">
                <CalendarContainer>
                  <FullCalendar
                    defaultView="timeGridWeek"
                    header={{
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                    }}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    ref={this.calendarComponentRef}
                    weekends={this.state.calendarWeekends}
                    events={this.state.calendarEvents}
                    selectable= {true}
                    selectMirror= {true}
                    select = {this.selectCallback}
                    datesRender = {this.triggerUpdate}
                    eventClick = {this.openEdit}
                  />
                </CalendarContainer>
              </Col>
            </Row>
          </OuterCalendarContainer>
        </RightContainer>
      </OuterContainer>
    );
  }
}

CalendarPage.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      groupid: PropTypes.string,
    }),
  }),
  setTimes: PropTypes.func,
  setDates: PropTypes.func,
  setTitle: PropTypes.func,
  setID: PropTypes.func,
  resetEventModal: PropTypes.func,
};
const mapDispatchToProps = {
  setTimes, setDates, resetEventModal, setTitle, setID,
};
export default connect(null, mapDispatchToProps)(CalendarPage);
